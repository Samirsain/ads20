import { prisma } from '@/lib/prisma'
import { getTrafficUserFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = getTrafficUserFromRequest(request)
    if (!user) return unauthorizedResponse()

    const userId = user.userId

    // 1. Fetch user wallet balance
    const userData = await prisma.trafficUser.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    })

    if (!userData) return unauthorizedResponse()

    // 2. Fetch all links of the user
    const links = await prisma.trafficLink.findMany({
      where: { userId },
      select: { id: true, totalClicks: true, uniqueClicks: true, conversions: true },
    })

    const linkIds = links.map((l) => l.id)
    const totalClicks = links.reduce((sum, l) => sum + l.totalClicks, 0)
    const uniqueClicks = links.reduce((sum, l) => sum + l.uniqueClicks, 0)
    const totalConversions = links.reduce((sum, l) => sum + l.conversions, 0)

    // 3. Fetch total earned
    const aggregateEarnings = await prisma.trafficEarning.aggregate({
      where: { userId },
      _sum: { amount: true },
    })
    const totalEarned = aggregateEarnings._sum.amount ?? 0

    // 4. Fetch recent earnings
    const recentEarnings = await prisma.trafficEarning.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        trafficLink: {
          select: { uniqueCode: true, targetUrl: true }
        }
      }
    })

    // 5. Clicks last 7 days chart data
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const clicks = linkIds.length > 0 ? await prisma.trafficClick.findMany({
      where: {
        trafficLinkId: { in: linkIds },
        timestamp: { gte: sevenDaysAgo },
      },
      select: { timestamp: true },
    }) : []

    // Group clicks by date
    const dateMap = new Map<string, number>()
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      dateMap.set(dateStr, 0)
    }

    clicks.forEach((c) => {
      const dateStr = c.timestamp.toISOString().split('T')[0]
      if (dateMap.has(dateStr)) {
        dateMap.set(dateStr, (dateMap.get(dateStr) ?? 0) + 1)
      }
    })

    const clicksLast7Days = Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, clicks: count }))
      .reverse() // from oldest to newest

    return NextResponse.json({
      success: true,
      data: {
        walletBalance: userData.walletBalance,
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
