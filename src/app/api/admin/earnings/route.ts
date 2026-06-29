import { prisma } from '@/lib/prisma'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

function getDateRange(dateStr: string | null): { gte: Date; lt: Date } | undefined {
  if (!dateStr) return undefined
  const [year, month, day] = dateStr.split('-').map(Number)
  const istOffsetMs = 5.5 * 60 * 60 * 1000
  const startIST = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  const gte = new Date(startIST.getTime() - istOffsetMs)
  const lt = new Date(gte.getTime() + 24 * 60 * 60 * 1000)
  return { gte, lt }
}

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const searchParams = request.nextUrl.searchParams
    const dateStr = searchParams.get('date')
    const dateRange = getDateRange(dateStr)

    const whereClause = dateRange ? { createdAt: dateRange } : {}

    // Get all traffic earnings grouped by user
    const earningsByUser = await prisma.trafficEarning.groupBy({
      by: ['userId'],
      where: whereClause,
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
    })

    // Get user details for all user IDs
    const userIds = earningsByUser.map((e) => e.userId)
    const users = await prisma.trafficUser.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, phone: true, walletBalance: true },
    })

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]))

    const data = earningsByUser.map((e) => ({
      userId: e.userId,
      user: userMap[e.userId] ?? null,
      totalEarned: Number(e._sum.amount ?? 0),
      conversions: e._count.id,
    }))

    // Platform totals for the date
    const [platformTotal, totalConversions] = await Promise.all([
      prisma.trafficEarning.aggregate({
        where: whereClause,
        _sum: { amount: true },
      }),
      prisma.trafficEarning.count({ where: whereClause }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        filterDate: dateStr ?? null,
        platformTotal: Number(platformTotal._sum.amount ?? 0),
        totalConversions,
        users: data,
      },
    })
  } catch (error) {
    console.error('[admin/earnings]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
