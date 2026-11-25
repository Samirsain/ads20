import { prisma } from '@/lib/prisma'
import { getPublisherFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { dayRange, todayIST } from '@/lib/appTime'
import { getAccountFinancialSummary } from '@/lib/settlement'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

function computeCpmRate(impressions: number, actions: number): number {
  if (impressions === 0) return 0.5
  const rate = (actions / impressions) * 100
  return Math.max(0.5, Math.min(20, rate))
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

    const [aggregateClicks, todayValidatedCount, topLinks, recentPayouts] = await Promise.all([
      prisma.trackingLink.aggregate({
        where: { publisherId },
        _sum: { clicks: true },
      }),
      // Count feeds CPM formula only — never returned to publisher.
      prisma.conversion.count({
        where: { publisherId, isValid: true, createdAt: todayBounds },
      }),
      prisma.trackingLink.findMany({
        where: { publisherId },
        orderBy: { clicks: 'desc' },
        take: 1,
        select: { id: true, uniqueCode: true, targetUrl: true, linkType: true, clicks: true, createdAt: true },
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
    ])

    const totalImpressions = aggregateClicks._sum.clicks ?? 0
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
        minWithdrawal: summary.minWithdrawal,
        canWithdraw: summary.canWithdraw,
        shortfallToMin: summary.shortfallToMin,
        payoutWindow: summary.payoutWindow,
        totalImpressions,
        currentCpm,
        topLink: topLinks[0] ?? null,
        recentPayouts,
      },
    })
  } catch (error) {
    console.error('[publisher/dashboard]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
