import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { paginationSchema } from '@/lib/validators'
import { APP_TIMEZONE, dateIn, dayRange, startOfDay } from '@/lib/appTime'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const BREAKDOWN_LIMIT = 100

// GET /api/admin/conversions?publisherId=&linkId=&from=YYYY-MM-DD&to=YYYY-MM-DD&q=&page=&limit=
// Admin only. `from`/`to` are inclusive calendar days in APP_TIMEZONE.
export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const params = request.nextUrl.searchParams
    const parsed = paginationSchema.safeParse({
      page: params.get('page') ?? undefined,
      limit: params.get('limit') ?? undefined,
    })
    const { page, limit } = parsed.success ? parsed.data : { page: 1, limit: 20 }
    const publisherId = params.get('publisherId')?.trim() || undefined
    const linkId = params.get('linkId')?.trim() || undefined
    const q = params.get('q')?.trim().slice(0, 100) || undefined
    const createdAt = dayRange(params.get('from'), params.get('to'))

    const where: Prisma.ConversionWhereInput = {
      ...(publisherId && { publisherId }),
      ...(linkId && { trackingLinkId: linkId }),
      ...(createdAt && { createdAt }),
      ...(q && {
        OR: [
          { id: q },
          { publisherId: q },
          { trackingLinkId: q },
          { clickId: q },
          { externalUserId: { contains: q, mode: 'insensitive' } },
          { trackingLink: { uniqueCode: { contains: q, mode: 'insensitive' } } },
          { publisher: { name: { contains: q, mode: 'insensitive' } } },
          { publisher: { email: { contains: q, mode: 'insensitive' } } },
        ],
      }),
    }

    const today = dateIn(new Date())

    const [conversions, matching, allTime, todayCount, byPublisherRaw, byLinkRaw] = await Promise.all([
      prisma.conversion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          externalUserId: true,
          clickId: true,
          amount: true,
          status: true,
          createdAt: true,
          publisher: { select: { id: true, name: true, email: true } },
          trackingLink: { select: { id: true, uniqueCode: true, targetUrl: true } },
        },
      }),
      prisma.conversion.count({ where }),
      prisma.conversion.count(),
      prisma.conversion.count({ where: { createdAt: { gte: startOfDay(today) } } }),
      prisma.conversion.groupBy({
        by: ['publisherId'],
        where,
        _count: { _all: true },
        orderBy: { _count: { publisherId: 'desc' } },
        take: BREAKDOWN_LIMIT,
      }),
      prisma.conversion.groupBy({
        by: ['trackingLinkId'],
        where,
        _count: { _all: true },
        orderBy: { _count: { trackingLinkId: 'desc' } },
        take: BREAKDOWN_LIMIT,
      }),
    ])

    const linkCounts = new Map(byLinkRaw.map((r) => [r.trackingLinkId, r._count._all]))
    // A selected publisher shows every link it owns, so links with no
    // conversions yet still get an explicit 0.
    const includeZeroLinks = publisherId && !linkId && !q

    const [publishers, links, selectedPublisher, selectedLink] = await Promise.all([
      prisma.publisher.findMany({
        where: { id: { in: byPublisherRaw.map((r) => r.publisherId) } },
        select: { id: true, name: true, email: true },
      }),
      prisma.trackingLink.findMany({
        where: includeZeroLinks
          ? { OR: [{ id: { in: [...linkCounts.keys()] } }, { publisherId }] }
          : { id: { in: [...linkCounts.keys()] } },
        select: {
          id: true,
          uniqueCode: true,
          targetUrl: true,
          createdAt: true,
          publisher: { select: { id: true, name: true } },
        },
      }),
      publisherId
        ? prisma.publisher.findUnique({
            where: { id: publisherId },
            select: { id: true, name: true, email: true },
          })
        : null,
      linkId
        ? prisma.trackingLink.findUnique({
            where: { id: linkId },
            select: { id: true, uniqueCode: true, targetUrl: true },
          })
        : null,
    ])

    const publisherById = new Map(publishers.map((p) => [p.id, p]))
    const byPublisher = byPublisherRaw.map((r) => ({
      publisherId: r.publisherId,
      name: publisherById.get(r.publisherId)?.name ?? null,
      email: publisherById.get(r.publisherId)?.email ?? null,
      conversions: r._count._all,
    }))

    const byLink = links
      .map((l) => ({
        linkId: l.id,
        code: l.uniqueCode,
        targetUrl: l.targetUrl,
        createdAt: l.createdAt,
        publisherId: l.publisher.id,
        publisherName: l.publisher.name,
        conversions: linkCounts.get(l.id) ?? 0,
      }))
      .sort((a, b) => b.conversions - a.conversions)

    return NextResponse.json({
      success: true,
      data: {
        timezone: APP_TIMEZONE,
        today,
        summary: { allTime, today: todayCount, matching },
        selected: { publisher: selectedPublisher, link: selectedLink },
        byPublisher,
        byLink,
        breakdownLimit: BREAKDOWN_LIMIT,
        conversions,
        pagination: { page, limit, total: matching, pages: Math.ceil(matching / limit) },
      },
    })
  } catch (error) {
    console.error('[admin/conversions]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
