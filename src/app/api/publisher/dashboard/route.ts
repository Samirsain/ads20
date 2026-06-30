import { prisma } from '@/lib/prisma'
import { getPublisherFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

function computeCpmRate(impressions: number, conversions: number): number {
  if (impressions === 0) return 0.5
  const convRate = (conversions / impressions) * 100
  return Math.max(0.5, Math.min(20, convRate))
}

export async function GET(request: NextRequest) {
  try {
    const publisher = getPublisherFromRequest(request)
    if (!publisher) return unauthorizedResponse()

    const publisherId = publisher.publisherId

    const publisherData = await prisma.publisher.findUnique({
      where: { id: publisherId },
      select: { walletBalance: true },
    })

    if (!publisherData) return unauthorizedResponse()

    // Total impressions (clicks) across all links
    const aggregateClicks = await prisma.trackingLink.aggregate({
      where: { publisherId },
      _sum: { clicks: true },
    })
    const totalImpressions = aggregateClicks._sum.clicks ?? 0

    // Today's date range (UTC)
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setUTCHours(23, 59, 59, 999)

    const [totalLeads, todayClicks, todayConversions, recentConversions, topLinks] = await Promise.all([
      prisma.conversion.count({ where: { publisherId } }),
      prisma.click.count({
        where: { publisherId, timestamp: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.conversion.count({
        where: { publisherId, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      // Recent conversions — NO amount field returned
      prisma.conversion.findMany({
        where: { publisherId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          externalUserId: true,
          status: true,
          createdAt: true,
          trackingLink: { select: { uniqueCode: true, targetUrl: true } },
        },
      }),
      prisma.trackingLink.findMany({
        where: { publisherId },
        orderBy: { clicks: 'desc' },
        take: 1,
      }),
    ])

    const currentCpm = computeCpmRate(todayClicks, todayConversions)
    const todayEarnings = parseFloat(((todayClicks / 1000) * currentCpm).toFixed(4))
    const topLink = topLinks[0] ?? null

    return NextResponse.json({
      success: true,
      data: {
        walletBalance: publisherData.walletBalance,
        totalImpressions,
        totalLeads,
        currentCpm,
        todayEarnings,
        recentConversions,
        topLink,
      },
    })
  } catch (error) {
    console.error('[publisher/dashboard]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
