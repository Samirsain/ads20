import { prisma } from '@/lib/prisma'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { paginationSchema } from '@/lib/validators'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const searchParams = request.nextUrl.searchParams
    const { page, limit } = paginationSchema.parse({
      page: searchParams.get('page') ?? 1,
      limit: searchParams.get('limit') ?? 20,
    })

    const skip = (page - 1) * limit

    const [conversions, total] = await Promise.all([
      prisma.conversion.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          externalUserId: true,
          amount: true,
          status: true,
          createdAt: true,
          publisher: { select: { name: true, email: true } },
          trackingLink: { select: { uniqueCode: true } },
        },
      }),
      prisma.conversion.count(),
    ])

    return Response.json({
      success: true,
      data: {
        conversions,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    console.error('[admin/conversions]', error)
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
