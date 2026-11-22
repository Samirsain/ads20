import { prisma } from '@/lib/prisma'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { paginationSchema } from '@/lib/validators'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const OUTCOMES = ['CREDITED', 'DUPLICATE', 'REJECTED']

// GET /api/admin/postback-log?outcome=REJECTED&page=1&limit=25
// Audit trail of conversion callbacks. Read-only: audit rows are never deleted.
export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const params = request.nextUrl.searchParams
    const parsed = paginationSchema.safeParse({
      page: params.get('page') ?? undefined,
      limit: params.get('limit') ?? 25,
    })
    const { page, limit } = parsed.success ? parsed.data : { page: 1, limit: 25 }
    const outcome = params.get('outcome')
    const where = outcome && OUTCOMES.includes(outcome) ? { outcome } : {}

    const [events, total] = await Promise.all([
      prisma.conversionEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.conversionEvent.count({ where }),
    ])

    const data = events.map((e) => ({
      id: e.id,
      at: e.createdAt.toISOString(),
      source: e.source,
      outcome: e.outcome,
      code: e.code,
      uid: e.externalUserId,
      clickId: e.clickId,
      type: e.linkType,
      secretMatched: e.secretMatched,
      secretHint: e.secretHint,
      publisherId: e.publisherId,
      trackingLinkId: e.trackingLinkId,
      conversionId: e.conversionId,
      ip: e.ip,
      result: e.reason,
    }))

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('[admin/postback-log GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
