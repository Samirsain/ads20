import { prisma } from '@/lib/prisma'
import { getPublisherFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { paginationSchema } from '@/lib/validators'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const publisher = getPublisherFromRequest(request)
    if (!publisher) return unauthorizedResponse()

    const searchParams = request.nextUrl.searchParams
    const parsed = paginationSchema.safeParse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    })

    const page = parsed.success ? parsed.data.page : 1
    const limit = parsed.success ? parsed.data.limit : 20
    const skip = (page - 1) * limit

    const [conversions, total] = await Promise.all([
      prisma.conversion.findMany({
        where: { publisherId: publisher.publisherId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          externalUserId: true,
          amount: true,
          status: true,
          createdAt: true,
          trackingLink: { select: { uniqueCode: true, targetUrl: true } },
        },
      }),
      prisma.conversion.count({ where: { publisherId: publisher.publisherId } }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        conversions,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    console.error('[publisher/conversions]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
