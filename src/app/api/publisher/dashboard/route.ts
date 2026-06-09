import { prisma } from '@/lib/prisma'
import { getPublisherFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const publisher = getPublisherFromRequest(request)
    if (!publisher) return unauthorizedResponse()

    const publisherId = publisher.publisherId

    // Fetch publisher details
    const publisherData = await prisma.publisher.findUnique({
      where: { id: publisherId },
      select: { walletBalance: true },
    })

    if (!publisherData) return unauthorizedResponse()

    // Sum of clicks across all tracking links
    const aggregateClicks = await prisma.trackingLink.aggregate({
      where: { publisherId },
      _sum: { clicks: true },
    })
    const totalClicks = aggregateClicks._sum.clicks ?? 0

    // Conversions count & sum
    const [totalConversions, aggregateEarnings, recentConversions, topLinks] = await Promise.all([
      prisma.conversion.count({
        where: { publisherId },
      }),
      prisma.conversion.aggregate({
        where: { publisherId },
        _sum: { amount: true },
      }),
      prisma.conversion.findMany({
        where: { publisherId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          trackingLink: {
            select: { uniqueCode: true, targetUrl: true }
          }
        }
      }),
      prisma.trackingLink.findMany({
        where: { publisherId },
        orderBy: { clicks: 'desc' },
        take: 1,
      }),
    ])

    const totalEarned = aggregateEarnings._sum.amount ?? 0
    const topLink = topLinks[0] ?? null

    return NextResponse.json({
      success: true,
      data: {
        walletBalance: publisherData.walletBalance,
        totalClicks,
        totalConversions,
        totalEarned,
        recentConversions,
        topLink,
      },
    })
  } catch (error) {
    console.error('[publisher/dashboard]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
