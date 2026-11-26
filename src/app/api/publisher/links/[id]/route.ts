import { prisma } from '@/lib/prisma'
import { getPublisherFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { updatePublisherLinkSchema } from '@/lib/validators'
import { getAppUrl } from '@/lib/appUrl'
import { getLinkAnalytics } from '@/lib/linkAnalytics'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/publisher/links/[id] — link-specific analytics for owner publisher
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const publisher = getPublisherFromRequest(request)
    if (!publisher) return unauthorizedResponse()

    const { id } = await params
    const appUrl = getAppUrl(request)
    const analytics = await getLinkAnalytics({
      linkId: id,
      portal: 'publisher',
      ownerId: publisher.publisherId,
      includeAdminConversionCounts: false,
      appUrl,
    })

    if (!analytics) {
      return NextResponse.json({ success: false, error: 'Link not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: analytics })
  } catch (error) {
    console.error('[publisher/links/[id] GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/publisher/links/[id] — edit link name, destination URL, or linkType
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const publisher = getPublisherFromRequest(request)
    if (!publisher) return unauthorizedResponse()

    const { id } = await params
    const body = await request.json()
    const parsed = updatePublisherLinkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const existing = await prisma.trackingLink.findUnique({
      where: { id },
      select: { id: true, publisherId: true, isDeleted: true },
    })

    if (!existing || existing.isDeleted) {
      return NextResponse.json({ success: false, error: 'Link not found' }, { status: 404 })
    }
    if (existing.publisherId !== publisher.publisherId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.trackingLink.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.targetUrl !== undefined && { targetUrl: parsed.data.targetUrl }),
        ...(parsed.data.linkType !== undefined && { linkType: parsed.data.linkType }),
      },
      select: {
        id: true,
        name: true,
        uniqueCode: true,
        targetUrl: true,
        linkType: true,
        clicks: true,
        isActive: true,
        createdAt: true,
      },
    })

    const appUrl = getAppUrl(request)
    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        trackingUrl: `${appUrl}/t/${updated.uniqueCode}`,
      },
    })
  } catch (error) {
    console.error('[publisher/links/[id] PATCH]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/publisher/links/[id] — soft-delete link while preserving historical clicks/earnings
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const publisher = getPublisherFromRequest(request)
    if (!publisher) return unauthorizedResponse()

    const { id } = await params
    const existing = await prisma.trackingLink.findUnique({
      where: { id },
      select: { id: true, publisherId: true, isDeleted: true },
    })

    if (!existing || existing.isDeleted) {
      return NextResponse.json({ success: false, error: 'Link not found' }, { status: 404 })
    }
    if (existing.publisherId !== publisher.publisherId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await prisma.trackingLink.update({
      where: { id },
      data: { isDeleted: true, isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[publisher/links/[id] DELETE]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

