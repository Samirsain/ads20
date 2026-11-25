import { prisma } from '@/lib/prisma'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { APP_TIMEZONE, dayRange, isDateStr } from '@/lib/appTime'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const searchParams = request.nextUrl.searchParams
    const dateStr = searchParams.get('date')
    const validDate = isDateStr(dateStr) ? dateStr : null
    const dateRange = validDate ? dayRange(validDate, validDate) : undefined

    const whereClause = dateRange ? { createdAt: dateRange, isValid: true } : { isValid: true }

    const earningsByUser = await prisma.trafficEarning.groupBy({
      by: ['userId'],
      where: whereClause,
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
    })

    const userIds = earningsByUser.map((e) => e.userId)
    const users = await prisma.trafficUser.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, phone: true, walletBalance: true, reservedBalance: true },
    })

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]))

    const data = earningsByUser.map((e) => ({
      userId: e.userId,
      user: userMap[e.userId] ?? null,
      totalEarned: Number(e._sum.amount ?? 0),
      conversions: e._count.id,
    }))

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
        timezone: APP_TIMEZONE,
        filterDate: validDate,
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
