import { prisma } from '@/lib/prisma'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { adminToggleLinkSchema } from '@/lib/validators'
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
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const { id } = await params
    const portal = request.nextUrl.searchParams.get('type') === 'traffic' ? 'traffic' : 'publisher'
    const appUrl = getAppUrl(request)

    const analytics = await getLinkAnalytics({
      linkId: id,
      portal,
      includeAdminConversionCounts: true,
      appUrl,
    })

    if (!analytics) {
      return NextResponse.json({ success: false, error: 'Link not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: analytics })
  } catch (error) {
    console.error('[admin/links/[id] GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const { id } = await params
    const body = await request.json()
    const parsed = adminToggleLinkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { type, isActive } = parsed.data

    if (type === 'publisher') {
      const updated = await prisma.trackingLink.update({
        where: { id },
        data: { isActive },
        select: { id: true, name: true, uniqueCode: true, isActive: true },
      })
      await prisma.adminAuditLog.create({
        data: {
          actorAdminId: admin.adminId,
          actorEmail: admin.email,
          action: isActive ? 'ENABLE_LINK' : 'DISABLE_LINK',
          targetType: 'TRACKING_LINK',
          targetId: id,
          affectedCount: 1,
          outcome: 'SUCCESS',
        },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    const updated = await prisma.trafficLink.update({
      where: { id },
      data: { isActive },
      select: { id: true, name: true, uniqueCode: true, isActive: true },
    })
    await prisma.adminAuditLog.create({
      data: {
        actorAdminId: admin.adminId,
        actorEmail: admin.email,
        action: isActive ? 'ENABLE_LINK' : 'DISABLE_LINK',
        targetType: 'TRAFFIC_LINK',
        targetId: id,
        affectedCount: 1,
        outcome: 'SUCCESS',
      },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[admin/links/[id] PATCH]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

