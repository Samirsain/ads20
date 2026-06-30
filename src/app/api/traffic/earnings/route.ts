import { prisma } from '@/lib/prisma'
import { getTrafficUserFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { paginationSchema } from '@/lib/validators'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

function getDateRange(dateStr: string | null): { gte: Date; lt: Date } | undefined {
  if (!dateStr) return undefined
  // dateStr format: YYYY-MM-DD (IST date)
  const [year, month, day] = dateStr.split('-').map(Number)
  // Build start/end in UTC by offsetting IST (+5:30 = 330 min)
  const istOffsetMs = 5.5 * 60 * 60 * 1000
  const startIST = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  const gte = new Date(startIST.getTime() - istOffsetMs)
  const lt = new Date(gte.getTime() + 24 * 60 * 60 * 1000)
  return { gte, lt }
}

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

    const dateStr = searchParams.get('date') // e.g. "2025-06-29"
    const dateRange = getDateRange(dateStr)

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
        earnings,
        totalAmount,
        filterDate: dateStr ?? null,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    console.error('[traffic/earnings]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
