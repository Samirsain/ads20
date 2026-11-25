import { prisma } from '@/lib/prisma'
import { getPublisherFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { APP_TIMEZONE, dateIn, todayIST } from '@/lib/appTime'
import { microsToNumber, toMicros } from '@/lib/money'
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

    const [clicks, rows, settlements, summary] = await Promise.all([
      prisma.click.findMany({
        where: { publisherId },
        select: { timestamp: true, isValid: true },
      }),
      prisma.conversion.findMany({
        where: { publisherId, isValid: true },
        select: { createdAt: true, amount: true, settlementId: true },
      }),
      prisma.dailySettlement.findMany({
        where: { accountType: 'PUBLISHER', accountId: publisherId },
        select: { settlementDate: true, status: true },
      }),
      getAccountFinancialSummary('PUBLISHER', publisherId),
    ])

    const impByDate = new Map<string, { total: number; valid: number }>()
    for (const c of clicks) {
      const date = dateIn(c.timestamp)
      const prev = impByDate.get(date) ?? { total: 0, valid: 0 }
      prev.total += 1
      if (c.isValid) prev.valid += 1
      impByDate.set(date, prev)
    }

    const countByDate = new Map<string, number>()
    const earnMicrosByDate = new Map<string, bigint>()
    const unsettledByDate = new Map<string, number>()
    for (const r of rows) {
      const date = dateIn(r.createdAt)
      countByDate.set(date, (countByDate.get(date) ?? 0) + 1)
      earnMicrosByDate.set(date, (earnMicrosByDate.get(date) ?? 0n) + toMicros(r.amount))
      if (!r.settlementId) {
        unsettledByDate.set(date, (unsettledByDate.get(date) ?? 0) + 1)
      }
    }

    const settlementMap = new Map(settlements.map((s) => [s.settlementDate, s.status]))
    const today = todayIST()

    const allDates = new Set([...impByDate.keys(), ...countByDate.keys()])
    const dailyData = Array.from(allDates)
      .sort()
      .reverse()
      .map((date) => {
        const imp = impByDate.get(date)?.total ?? 0
        const validClicks = impByDate.get(date)?.valid ?? 0
        const actions = countByDate.get(date) ?? 0
        const cpmRate = computeCpmRate(imp, actions)
        const earnings = microsToNumber(earnMicrosByDate.get(date) ?? 0n, 4)

        let settlementStatus = settlementMap.get(date) ?? 'NONE'
        if (settlementStatus === 'NONE' && earnings > 0) {
          settlementStatus = date === today ? 'ACCRUING_TODAY' : 'PENDING_SETTLEMENT'
        }

        // Action counts feed cpmRate only — never returned to publishers.
        return { date, impressions: imp, validClicks, cpmRate, earnings, settlementStatus }
      })

    const totalImpressions = Array.from(impByDate.values()).reduce((a, b) => a + b.total, 0)
    const totalEarnings = microsToNumber(
      Array.from(earnMicrosByDate.values()).reduce((a, b) => a + b, 0n),
      2
    )

    const todayImp = impByDate.get(today)?.total ?? 0
    const todayActions = countByDate.get(today) ?? 0
    const currentCpm = computeCpmRate(todayImp, todayActions)
    const todayEarnings = microsToNumber(earnMicrosByDate.get(today) ?? 0n, 4)

    return NextResponse.json({
      success: true,
      data: {
        timezone: APP_TIMEZONE,
        todayDate: today,
        dailyData,
        currentCpm,
        todayEarnings,
        yesterdayEarnings: summary?.yesterdayEarnings ?? 0,
        availableBalance: summary?.availableBalance ?? 0,
        pendingPayment: summary?.pendingPayment ?? 0,
        totalPaid: summary?.totalPaid ?? 0,
        totalImpressions,
        totalEarnings,
      },
    })
  } catch (error) {
    console.error('[publisher/earnings GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
