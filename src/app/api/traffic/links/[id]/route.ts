import { prisma } from '@/lib/prisma'
import { getTrafficUserFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { updateTrafficLinkSchema } from '@/lib/validators'
import { getAppUrl } from '@/lib/appUrl'
import { getLinkAnalytics } from '@/lib/linkAnalytics'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getTrafficUserFromRequest(request)
    if (!user) return unauthorizedResponse()

    const { id } = await params
    const appUrl = getAppUrl(request)
    const analytics = await getLinkAnalytics({
      linkId: id,
      portal: 'traffic',
      ownerId: user.userId,
      includeAdminConversionCounts: true,
      appUrl,
    })

    if (!analytics) {
      return NextResponse.json({ success: false, error: 'Link not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: analytics })
  } catch (error) {
    console.error('[traffic/links/[id] GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getTrafficUserFromRequest(request)
    if (!user) return unauthorizedResponse()

    const { id } = await params
    const body = await request.json()
    const parsed = updateTrafficLinkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const existing = await prisma.trafficLink.findUnique({
      where: { id },
      select: { id: true, userId: true, isDeleted: true },
    })
    if (!existing || existing.isDeleted) {
      return NextResponse.json({ success: false, error: 'Link not found' }, { status: 404 })
    }
    if (existing.userId !== user.userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.trafficLink.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.targetUrl !== undefined && { targetUrl: parsed.data.targetUrl }),
        ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
      },
    })

    const appUrl = getAppUrl(request)
    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        trackingUrl: `${appUrl}/send/${updated.uniqueCode}`,
      },
    })
  } catch (error) {
    console.error('[traffic/links/[id] PATCH]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getTrafficUserFromRequest(request)
    if (!user) return unauthorizedResponse()

    const { id } = await params
    const existing = await prisma.trafficLink.findUnique({
      where: { id },
      select: { id: true, userId: true, isDeleted: true },
    })
    if (!existing || existing.isDeleted) {
      return NextResponse.json({ success: false, error: 'Link not found' }, { status: 404 })
    }
    if (existing.userId !== user.userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await prisma.trafficLink.update({
      where: { id },
      data: { isDeleted: true, isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[traffic/links/[id] DELETE]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

