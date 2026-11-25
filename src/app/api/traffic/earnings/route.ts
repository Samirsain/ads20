import { prisma } from '@/lib/prisma'
import { getTrafficUserFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { APP_TIMEZONE, dayRange, isDateStr } from '@/lib/appTime'
import { paginationSchema } from '@/lib/validators'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = getTrafficUserFromRequest(request)
    if (!user) return unauthorizedResponse()

    const searchParams = request.nextUrl.searchParams
    const parsed = paginationSchema.safeParse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    })

    const page = parsed.success ? parsed.data.page : 1
    const limit = parsed.success ? parsed.data.limit : 50
    const skip = (page - 1) * limit

    const dateStr = searchParams.get('date')
    const validDate = isDateStr(dateStr) ? dateStr : null
    const dateRange = validDate ? dayRange(validDate, validDate) : undefined

    const whereClause = {
      userId: user.userId,
      ...(dateRange ? { createdAt: dateRange } : {}),
    }

    const [earnings, total, totalAmountResult] = await Promise.all([
      prisma.trafficEarning.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          externalUserId: true,
          amount: true,
          settlementId: true,
          settledAt: true,
          createdAt: true,
          trafficLink: { select: { uniqueCode: true, targetUrl: true } },
        },
      }),
      prisma.trafficEarning.count({ where: whereClause }),
      prisma.trafficEarning.aggregate({
        where: whereClause,
        _sum: { amount: true },
      }),
    ])

    const totalAmount = Number(totalAmountResult._sum.amount ?? 0)

    return NextResponse.json({
      success: true,
      data: {
        timezone: APP_TIMEZONE,
        earnings,
        totalAmount,
        filterDate: validDate,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    console.error('[traffic/earnings]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
