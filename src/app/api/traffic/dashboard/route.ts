import { prisma } from '@/lib/prisma'
import { getTrafficUserFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { addDays, dateIn, dayRange, todayIST } from '@/lib/appTime'
import { getAccountFinancialSummary } from '@/lib/settlement'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = getTrafficUserFromRequest(request)
    if (!user) return unauthorizedResponse()

    const userId = user.userId
    const summary = await getAccountFinancialSummary('TRAFFIC', userId)
    if (!summary) return unauthorizedResponse()

    const links = await prisma.trafficLink.findMany({
      where: { userId },
      select: { id: true, totalClicks: true, uniqueClicks: true, conversions: true },
    })

    const linkIds = links.map((l) => l.id)
    const totalClicks = links.reduce((sum, l) => sum + l.totalClicks, 0)
    const uniqueClicks = links.reduce((sum, l) => sum + l.uniqueClicks, 0)
    const totalConversions = links.reduce((sum, l) => sum + l.conversions, 0)

    const aggregateEarnings = await prisma.trafficEarning.aggregate({
      where: { userId, isValid: true },
      _sum: { amount: true },
    })
    const totalEarned = Number(aggregateEarnings._sum.amount ?? 0)

    const recentEarnings = await prisma.trafficEarning.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        trafficLink: {
          select: { uniqueCode: true, targetUrl: true },
        },
      },
    })

    const today = todayIST()
    const sixDaysAgo = addDays(today, -6)
    const range7Days = dayRange(sixDaysAgo, today)!

    const clicks =
      linkIds.length > 0
        ? await prisma.trafficClick.findMany({
            where: {
              trafficLinkId: { in: linkIds },
              timestamp: range7Days,
            },
            select: { timestamp: true },
          })
        : []

    const dateMap = new Map<string, number>()
    for (let i = 6; i >= 0; i--) {
      dateMap.set(addDays(today, -i), 0)
    }

    for (const c of clicks) {
      const d = dateIn(c.timestamp)
      if (dateMap.has(d)) {
        dateMap.set(d, (dateMap.get(d) ?? 0) + 1)
      }
    }

    const clicksLast7Days = Array.from(dateMap.entries()).map(([date, count]) => ({
      date,
      clicks: count,
    }))

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
        totalClicks,
        uniqueClicks,
        totalConversions,
        totalEarned,
        clicksLast7Days,
        recentEarnings,
      },
    })
  } catch (error) {
    console.error('[traffic/dashboard]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
