import { prisma } from '@/lib/prisma'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { dayRange, getPayoutWindowStatus, todayIST } from '@/lib/appTime'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const today = todayIST()
    const todayBounds = dayRange(today, today)!

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
      approvedPubWithdrawals,
      approvedTrafficWithdrawals,
      paidPubAggregate,
      paidTrafficAggregate,
      pubWalletAggregate,
      trafficWalletAggregate,
      todayPubClicks,
      todayTrafficClicks,
      todayPubEarnedAgg,
      todayTrafficEarnedAgg,
      unsettledHistoricalPub,
      unsettledHistoricalTraffic,
    ] = await Promise.all([
      prisma.publisher.count(),
      prisma.trafficUser.count(),
      prisma.trackingLink.aggregate({ _sum: { clicks: true } }),
      prisma.trafficLink.aggregate({ _sum: { totalClicks: true, conversions: true } }),
      prisma.conversion.count({ where: { isValid: true } }),
      prisma.conversion.aggregate({ where: { isValid: true }, _sum: { amount: true } }),
      prisma.trafficEarning.aggregate({ where: { isValid: true }, _sum: { amount: true } }),
      prisma.pubWithdrawal.count({ where: { status: 'PENDING' } }),
      prisma.trafficWithdrawal.count({ where: { status: 'PENDING' } }),
      prisma.pubWithdrawal.count({ where: { status: 'APPROVED' } }),
      prisma.trafficWithdrawal.count({ where: { status: 'APPROVED' } }),
      prisma.pubWithdrawal.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      prisma.trafficWithdrawal.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      prisma.publisher.aggregate({ _sum: { walletBalance: true, reservedBalance: true } }),
      prisma.trafficUser.aggregate({ _sum: { walletBalance: true, reservedBalance: true } }),
      prisma.click.count({ where: { timestamp: todayBounds } }),
      prisma.trafficClick.count({ where: { timestamp: todayBounds } }),
      prisma.conversion.aggregate({ where: { isValid: true, createdAt: todayBounds }, _sum: { amount: true } }),
      prisma.trafficEarning.aggregate({ where: { isValid: true, createdAt: todayBounds }, _sum: { amount: true } }),
      prisma.conversion.count({ where: { isValid: true, settlementId: null, createdAt: { lt: todayBounds.gte } } }),
      prisma.trafficEarning.count({ where: { isValid: true, settlementId: null, createdAt: { lt: todayBounds.gte } } }),
    ])

    const totalClicks = (pubLinksAggregate._sum.clicks ?? 0) + (trafficLinksAggregate._sum.totalClicks ?? 0)
    const totalConversions = totalConversionsCount + (trafficLinksAggregate._sum.conversions ?? 0)
    const totalPubEarned = Number(pubEarningsAggregate._sum.amount ?? 0)
    const totalTrafficEarned = Number(trafficEarningsAggregate._sum.amount ?? 0)
    const pendingWithdrawals = pendingPubWithdrawals + pendingTrafficWithdrawals
    const approvedWithdrawals = approvedPubWithdrawals + approvedTrafficWithdrawals
    const totalPaid =
      Number(paidPubAggregate._sum.amount ?? 0) + Number(paidTrafficAggregate._sum.amount ?? 0)

    const totalAvailableBalances =
      Number(pubWalletAggregate._sum.walletBalance ?? 0) +
      Number(trafficWalletAggregate._sum.walletBalance ?? 0)
    const totalReservedBalances =
      Number(pubWalletAggregate._sum.reservedBalance ?? 0) +
      Number(trafficWalletAggregate._sum.reservedBalance ?? 0)

    return NextResponse.json({
      success: true,
      data: {
        timezone: 'Asia/Kolkata',
        today,
        payoutWindow: getPayoutWindowStatus(),
        totalPublishers,
        totalTrafficUsers,
        pubClicks: pubLinksAggregate._sum.clicks ?? 0,
        trafficClicks: trafficLinksAggregate._sum.totalClicks ?? 0,
        totalClicks,
        todayClicks: todayPubClicks + todayTrafficClicks,
        todayEarned:
          Number(todayPubEarnedAgg._sum.amount ?? 0) +
          Number(todayTrafficEarnedAgg._sum.amount ?? 0),
        totalConversions,
        totalPubEarned,
        totalTrafficEarned,
        pendingWithdrawals,
        approvedWithdrawals,
        totalAvailableBalances,
        totalReservedBalances,
        totalPaid,
        unsettledHistoricalRecords: unsettledHistoricalPub + unsettledHistoricalTraffic,
      },
    })
  } catch (error) {
    console.error('[admin/stats]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
