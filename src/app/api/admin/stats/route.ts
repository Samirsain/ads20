import { prisma } from '@/lib/prisma'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const [
      totalPublishers,
      totalTrafficUsers,
      pubLinksAggregate,
      trafficLinksAggregate,
      totalConversionsCount,
      pubEarningsAggregate,
      trafficEarningsAggregate,
      pendingPubWithdrawals,
      pendingTrafficWithdrawals,
      paidPubAggregate,
      paidTrafficAggregate,
    ] = await Promise.all([
      prisma.publisher.count(),
      prisma.trafficUser.count(),
      prisma.trackingLink.aggregate({
        _sum: { clicks: true },
      }),
      prisma.trafficLink.aggregate({
        _sum: { totalClicks: true, conversions: true },
      }),
      prisma.conversion.count(),
      prisma.conversion.aggregate({
        _sum: { amount: true },
      }),
      prisma.trafficEarning.aggregate({
        _sum: { amount: true },
      }),
      prisma.pubWithdrawal.count({
        where: { status: 'PENDING' },
      }),
      prisma.trafficWithdrawal.count({
        where: { status: 'PENDING' },
      }),
      prisma.pubWithdrawal.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.trafficWithdrawal.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
    ])

    const totalClicks = (pubLinksAggregate._sum.clicks ?? 0) + (trafficLinksAggregate._sum.totalClicks ?? 0)
    const totalConversions = totalConversionsCount + (trafficLinksAggregate._sum.conversions ?? 0)
    const totalPubEarned = pubEarningsAggregate._sum.amount ?? 0
    const totalTrafficEarned = trafficEarningsAggregate._sum.amount ?? 0
    const pendingWithdrawals = pendingPubWithdrawals + pendingTrafficWithdrawals
    const totalPaid = (paidPubAggregate._sum.amount ?? 0) + (paidTrafficAggregate._sum.amount ?? 0)

    return NextResponse.json({
      success: true,
      data: {
        totalPublishers,
        totalTrafficUsers,
        pubClicks: pubLinksAggregate._sum.clicks ?? 0,
        trafficClicks: trafficLinksAggregate._sum.totalClicks ?? 0,
        totalClicks,
        totalConversions,
        totalPubEarned,
        totalTrafficEarned,
        pendingWithdrawals,
        totalPaid,
      },
    })
  } catch (error) {
    console.error('[admin/stats]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
