import { prisma } from '@/lib/prisma'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { dayRange, getPayoutWindowStatus, todayIST } from '@/lib/appTime'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

interface StatsRow {
  totalPublishers: bigint | number
  totalTrafficUsers: bigint | number
  pubClicks: bigint | number
  trafficClicks: bigint | number
  trafficConversions: bigint | number
  pubConversions: bigint | number
  totalPubEarned: string | number | null
  totalTrafficEarned: string | number | null
  pendingPub: bigint | number
  pendingTraffic: bigint | number
  approvedPub: bigint | number
  approvedTraffic: bigint | number
  paidPub: string | number | null
  paidTraffic: string | number | null
  pubWallet: string | number | null
  pubReserved: string | number | null
  trafficWallet: string | number | null
  trafficReserved: string | number | null
  todayPubClicks: bigint | number
  todayTrafficClicks: bigint | number
  todayPubEarned: string | number | null
  todayTrafficEarned: string | number | null
  unsettledPub: bigint | number
  unsettledTraffic: bigint | number
}

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const today = todayIST()
    const todayBounds = dayRange(today, today)!

    const [row] = await prisma.$queryRaw<StatsRow[]>`
      SELECT
        (SELECT COUNT(*) FROM "Publisher")::bigint AS "totalPublishers",
        (SELECT COUNT(*) FROM "TrafficUser")::bigint AS "totalTrafficUsers",
        (SELECT COALESCE(SUM("clicks"), 0) FROM "TrackingLink")::bigint AS "pubClicks",
        (SELECT COALESCE(SUM("totalClicks"), 0) FROM "TrafficLink")::bigint AS "trafficClicks",
        (SELECT COALESCE(SUM("conversions"), 0) FROM "TrafficLink")::bigint AS "trafficConversions",
        (SELECT COUNT(*) FROM "Conversion" WHERE "isValid" = true)::bigint AS "pubConversions",
        (SELECT COALESCE(SUM("amount"), 0) FROM "Conversion" WHERE "isValid" = true)::text AS "totalPubEarned",
        (SELECT COALESCE(SUM("amount"), 0) FROM "TrafficEarning" WHERE "isValid" = true)::text AS "totalTrafficEarned",
        (SELECT COUNT(*) FROM "PubWithdrawal" WHERE "status" = 'PENDING')::bigint AS "pendingPub",
        (SELECT COUNT(*) FROM "TrafficWithdrawal" WHERE "status" = 'PENDING')::bigint AS "pendingTraffic",
        (SELECT COUNT(*) FROM "PubWithdrawal" WHERE "status" = 'APPROVED')::bigint AS "approvedPub",
        (SELECT COUNT(*) FROM "TrafficWithdrawal" WHERE "status" = 'APPROVED')::bigint AS "approvedTraffic",
        (SELECT COALESCE(SUM("amount"), 0) FROM "PubWithdrawal" WHERE "status" = 'PAID')::text AS "paidPub",
        (SELECT COALESCE(SUM("amount"), 0) FROM "TrafficWithdrawal" WHERE "status" = 'PAID')::text AS "paidTraffic",
        (SELECT COALESCE(SUM("walletBalance"), 0) FROM "Publisher")::text AS "pubWallet",
        (SELECT COALESCE(SUM("reservedBalance"), 0) FROM "Publisher")::text AS "pubReserved",
        (SELECT COALESCE(SUM("walletBalance"), 0) FROM "TrafficUser")::text AS "trafficWallet",
        (SELECT COALESCE(SUM("reservedBalance"), 0) FROM "TrafficUser")::text AS "trafficReserved",
        (SELECT COUNT(*) FROM "Click" WHERE "timestamp" >= ${todayBounds.gte} AND "timestamp" < ${todayBounds.lt})::bigint AS "todayPubClicks",
        (SELECT COUNT(*) FROM "TrafficClick" WHERE "timestamp" >= ${todayBounds.gte} AND "timestamp" < ${todayBounds.lt})::bigint AS "todayTrafficClicks",
        (SELECT COALESCE(SUM("amount"), 0) FROM "Conversion" WHERE "isValid" = true AND "createdAt" >= ${todayBounds.gte} AND "createdAt" < ${todayBounds.lt})::text AS "todayPubEarned",
        (SELECT COALESCE(SUM("amount"), 0) FROM "TrafficEarning" WHERE "isValid" = true AND "createdAt" >= ${todayBounds.gte} AND "createdAt" < ${todayBounds.lt})::text AS "todayTrafficEarned",
        (SELECT COUNT(*) FROM "Conversion" WHERE "isValid" = true AND "settlementId" IS NULL AND "createdAt" < ${todayBounds.gte})::bigint AS "unsettledPub",
        (SELECT COUNT(*) FROM "TrafficEarning" WHERE "isValid" = true AND "settlementId" IS NULL AND "createdAt" < ${todayBounds.gte})::bigint AS "unsettledTraffic"
    `

    const pubClicks = Number(row.pubClicks ?? 0)
    const trafficClicks = Number(row.trafficClicks ?? 0)

    return NextResponse.json({
      success: true,
      data: {
        timezone: 'Asia/Kolkata',
        today,
        payoutWindow: getPayoutWindowStatus(),
        totalPublishers: Number(row.totalPublishers ?? 0),
        totalTrafficUsers: Number(row.totalTrafficUsers ?? 0),
        pubClicks,
        trafficClicks,
        totalClicks: pubClicks + trafficClicks,
        todayClicks: Number(row.todayPubClicks ?? 0) + Number(row.todayTrafficClicks ?? 0),
        todayEarned: Number(row.todayPubEarned ?? 0) + Number(row.todayTrafficEarned ?? 0),
        totalConversions: Number(row.pubConversions ?? 0) + Number(row.trafficConversions ?? 0),
        totalPubEarned: Number(row.totalPubEarned ?? 0),
        totalTrafficEarned: Number(row.totalTrafficEarned ?? 0),
        pendingWithdrawals: Number(row.pendingPub ?? 0) + Number(row.pendingTraffic ?? 0),
        approvedWithdrawals: Number(row.approvedPub ?? 0) + Number(row.approvedTraffic ?? 0),
        totalAvailableBalances: Number(row.pubWallet ?? 0) + Number(row.trafficWallet ?? 0),
        totalReservedBalances: Number(row.pubReserved ?? 0) + Number(row.trafficReserved ?? 0),
        totalPaid: Number(row.paidPub ?? 0) + Number(row.paidTraffic ?? 0),
        unsettledHistoricalRecords: Number(row.unsettledPub ?? 0) + Number(row.unsettledTraffic ?? 0),
      },
    })
  } catch (error) {
    console.error('[admin/stats]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
