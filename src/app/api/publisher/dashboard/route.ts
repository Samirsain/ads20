import { prisma } from '@/lib/prisma'
import { getPublisherFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { APP_TIMEZONE, addDays, dayRange, todayIST } from '@/lib/appTime'
import { getAccountFinancialSummary } from '@/lib/settlement'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

function computeCpmRate(impressions: number, actions: number): number {
  if (impressions === 0) return 0.5
  const rate = (actions / impressions) * 100
  return Math.max(0.5, Math.min(20, rate))
}

interface DayClickRow {
  day: string
  clicks: bigint | number
}

interface DayEarnRow {
  day: string
  earnings: string | number | null
}

export async function GET(request: NextRequest) {
  try {
    const publisher = getPublisherFromRequest(request)
    if (!publisher) return unauthorizedResponse()

    const publisherId = publisher.publisherId
    const summary = await getAccountFinancialSummary('PUBLISHER', publisherId)
    if (!summary) return unauthorizedResponse()

    const today = todayIST()
    const todayBounds = dayRange(today, today)!
    const since7 = dayRange(addDays(today, -6), today)!

    const [
      aggregateClicks,
      totalActiveLinks,
      totalEarningsAgg,
      todayValidatedCount,
      topLinks,
      recentPayouts,
      last7ClickRows,
      last7EarnRows,
    ] = await Promise.all([
      prisma.trackingLink.aggregate({
        where: { publisherId },
        _sum: { clicks: true },
      }),
      prisma.trackingLink.count({
        where: { publisherId, isActive: true, isDeleted: false },
      }),
      prisma.conversion.aggregate({
        where: { publisherId, isValid: true },
        _sum: { amount: true },
      }),
      // Count feeds CPM formula only — never returned to publisher.
      prisma.conversion.count({
        where: { publisherId, isValid: true, createdAt: todayBounds },
      }),
      prisma.trackingLink.findMany({
        where: { publisherId, isDeleted: false },
        orderBy: { clicks: 'desc' },
        take: 1,
        select: {
          id: true,
          name: true,
          uniqueCode: true,
          targetUrl: true,
          linkType: true,
          clicks: true,
          createdAt: true,
        },
      }),
      prisma.pubWithdrawal.findMany({
        where: { publisherId },
        orderBy: { requestedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          amount: true,
          network: true,
          status: true,
          txReference: true,
          requestedAt: true,
          processedAt: true,
        },
      }),
      prisma.$queryRaw<DayClickRow[]>`
        SELECT
          to_char("timestamp" AT TIME ZONE ${APP_TIMEZONE}, 'YYYY-MM-DD') AS day,
          COUNT(*) FILTER (WHERE "isValid" = true)::bigint AS clicks
        FROM "Click"
        WHERE "publisherId" = ${publisherId}
          AND "timestamp" >= ${since7.gte}
        GROUP BY 1
      `,
      prisma.$queryRaw<DayEarnRow[]>`
        SELECT
          to_char("createdAt" AT TIME ZONE ${APP_TIMEZONE}, 'YYYY-MM-DD') AS day,
          COALESCE(SUM("amount"), 0)::text AS earnings
        FROM "Conversion"
        WHERE "publisherId" = ${publisherId}
          AND "isValid" = true
          AND "createdAt" >= ${since7.gte}
        GROUP BY 1
      `,
    ])

    const clickMap = new Map(last7ClickRows.map((r) => [r.day, Number(r.clicks)]))
    const earnMap = new Map(last7EarnRows.map((r) => [r.day, Number(r.earnings ?? 0)]))
    const dailySeries = Array.from({ length: 7 }, (_, idx) => {
      const date = addDays(today, idx - 6)
      return {
        date,
        clicks: clickMap.get(date) ?? 0,
        earnings: parseFloat((earnMap.get(date) ?? 0).toFixed(4)),
      }
    })

    const totalImpressions = aggregateClicks._sum.clicks ?? 0
    const totalEarnings = Number(totalEarningsAgg._sum.amount ?? 0)
    const currentCpm = computeCpmRate(summary.todayClicks, todayValidatedCount)

    return NextResponse.json({
      success: true,
      data: {
        timezone: summary.timezone,
        todayDate: summary.todayDate,
        yesterdayDate: summary.yesterdayDate,
        walletBalance: summary.availableBalance.toFixed(2),
        availableBalance: summary.availableBalance,
        pendingPayment: summary.pendingPayment,
        totalPaid: summary.totalPaid,
        todayClicks: summary.todayClicks,
        todayValidClicks: summary.todayValidClicks,
        todayEarnings: summary.todayEarnings,
        yesterdayEarnings: summary.yesterdayEarnings,
        yesterdaySettlementStatus: summary.yesterdaySettlementStatus,
        totalEarnings,
        totalActiveLinks,
        minWithdrawal: summary.minWithdrawal,
        canWithdraw: summary.canWithdraw,
        shortfallToMin: summary.shortfallToMin,
        payoutWindow: summary.payoutWindow,
        totalImpressions,
        currentCpm,
        topLink: topLinks[0] ?? null,
        recentPayouts,
        dailySeries,
      },
    })
  } catch (error) {
    console.error('[publisher/dashboard]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
