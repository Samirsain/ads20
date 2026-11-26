import { prisma } from '@/lib/prisma'
import { getPublisherFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { APP_TIMEZONE, todayIST } from '@/lib/appTime'
import { getAccountFinancialSummary } from '@/lib/settlement'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

function computeCpmRate(impressions: number, actions: number): number {
  if (impressions === 0) return 0.5
  const rate = (actions / impressions) * 100
  return Math.max(0.5, Math.min(20, rate))
}

interface ClickDayAgg {
  day: string
  total: bigint | number
  valid: bigint | number
}

interface ConvDayAgg {
  day: string
  actions: bigint | number
  earnings: string | number | null
}

export async function GET(request: NextRequest) {
  try {
    const publisher = getPublisherFromRequest(request)
    if (!publisher) return unauthorizedResponse()

    const publisherId = publisher.publisherId

    const [clickAgg, convAgg, settlements, summary] = await Promise.all([
      prisma.$queryRaw<ClickDayAgg[]>`
        SELECT
          to_char("timestamp" AT TIME ZONE ${APP_TIMEZONE}, 'YYYY-MM-DD') AS day,
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (WHERE "isValid" = true)::bigint AS valid
        FROM "Click"
        WHERE "publisherId" = ${publisherId}
        GROUP BY 1
      `,
      prisma.$queryRaw<ConvDayAgg[]>`
        SELECT
          to_char("createdAt" AT TIME ZONE ${APP_TIMEZONE}, 'YYYY-MM-DD') AS day,
          COUNT(*)::bigint AS actions,
          COALESCE(SUM("amount"), 0)::text AS earnings
        FROM "Conversion"
        WHERE "publisherId" = ${publisherId}
          AND "isValid" = true
        GROUP BY 1
      `,
      prisma.dailySettlement.findMany({
        where: { accountType: 'PUBLISHER', accountId: publisherId },
        select: { settlementDate: true, status: true },
      }),
      getAccountFinancialSummary('PUBLISHER', publisherId),
    ])

    const impByDate = new Map(
      clickAgg.map((r) => [r.day, { total: Number(r.total), valid: Number(r.valid) }])
    )
    const convByDate = new Map(
      convAgg.map((r) => [r.day, { actions: Number(r.actions), earnings: Number(r.earnings ?? 0) }])
    )
    const settlementMap = new Map(settlements.map((s) => [s.settlementDate, s.status]))
    const today = todayIST()

    const allDates = new Set([...impByDate.keys(), ...convByDate.keys()])
    const dailyData = Array.from(allDates)
      .sort()
      .reverse()
      .map((date) => {
        const imp = impByDate.get(date)?.total ?? 0
        const validClicks = impByDate.get(date)?.valid ?? 0
        const actions = convByDate.get(date)?.actions ?? 0
        const cpmRate = computeCpmRate(imp, actions)
        const earnings = parseFloat((convByDate.get(date)?.earnings ?? 0).toFixed(4))

        let settlementStatus = settlementMap.get(date) ?? 'NONE'
        if (settlementStatus === 'NONE' && earnings > 0) {
          settlementStatus = date === today ? 'ACCRUING_TODAY' : 'PENDING_SETTLEMENT'
        }

        // Action counts feed cpmRate only — never returned to publishers.
        return { date, impressions: imp, validClicks, cpmRate, earnings, settlementStatus }
      })

    const totalImpressions = Array.from(impByDate.values()).reduce((a, b) => a + b.total, 0)
    const totalEarnings = parseFloat(
      Array.from(convByDate.values())
        .reduce((a, b) => a + b.earnings, 0)
        .toFixed(2)
    )

    const todayImp = impByDate.get(today)?.total ?? 0
    const todayActions = convByDate.get(today)?.actions ?? 0
    const currentCpm = computeCpmRate(todayImp, todayActions)
    const todayEarnings = parseFloat((convByDate.get(today)?.earnings ?? 0).toFixed(4))

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
