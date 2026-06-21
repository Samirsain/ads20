import { prisma } from '@/lib/prisma'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { paginationSchema } from '@/lib/validators'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - List publishers
export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const searchParams = request.nextUrl.searchParams
    const parsed = paginationSchema.safeParse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    })

    const page = parsed.success ? parsed.data.page : 1
    const limit = parsed.success ? parsed.data.limit : 20
    const skip = (page - 1) * limit

    const [publishers, total, clicksData] = await Promise.all([
      prisma.publisher.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          walletBalance: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              trackingLinks: true,
              conversions: true,
            },
          },
        },
      }),
      prisma.publisher.count(),
      prisma.trackingLink.groupBy({
        by: ['publisherId'],
        _sum: { clicks: true },
      }),
    ])

    const clicksMap = Object.fromEntries(
      clicksData.map((row) => [row.publisherId, row._sum.clicks ?? 0])
    )

    const publishersWithClicks = publishers.map((pub) => ({
      ...pub,
      totalClicks: clicksMap[pub.id] ?? 0,
    }))

    return NextResponse.json({
      success: true,
      data: {
        publishers: publishersWithClicks,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    console.error('[admin/publishers GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Toggle publisher active status
export async function POST(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const body = await request.json()
    const { id, isActive } = body

    if (!id || typeof isActive !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Missing id or isActive' }, { status: 400 })
    }

    const updated = await prisma.publisher.update({
      where: { id },
      data: { isActive },
      select: { id: true, email: true, name: true, isActive: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[admin/publishers POST]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
