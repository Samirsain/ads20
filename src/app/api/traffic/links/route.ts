import { prisma } from '@/lib/prisma'
import { getTrafficUserFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { createTrafficLinkSchema } from '@/lib/validators'
import { getAppUrl } from '@/lib/appUrl'
import { getTrafficLinkList } from '@/lib/linkAnalytics'
import { nanoid } from 'nanoid'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/traffic/links — list traffic links with todayClicks & aggregate stats
export async function GET(request: NextRequest) {
  try {
    const user = getTrafficUserFromRequest(request)
    if (!user) return unauthorizedResponse()

    const appUrl = getAppUrl(request)
    const data = await getTrafficLinkList(user.userId, appUrl)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[traffic/links GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/traffic/links — create a new named traffic link
export async function POST(request: NextRequest) {
  try {
    const user = getTrafficUserFromRequest(request)
    if (!user) return unauthorizedResponse()

    const body = await request.json()
    const result = createTrafficLinkSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { targetUrl, name: rawName } = result.data
    const uniqueCode = nanoid(8)
    const name = rawName?.trim() || `Traffic ${uniqueCode}`
    const appUrl = getAppUrl(request)

    const link = await prisma.trafficLink.create({
      data: {
        userId: user.userId,
        name,
        uniqueCode,
        targetUrl,
        isActive: true,
        isDeleted: false,
      },
    })

    const trackingUrl = `${appUrl}/send/${uniqueCode}`

    return NextResponse.json(
      {
        success: true,
        data: {
          id: link.id,
          name: link.name,
          uniqueCode: link.uniqueCode,
          targetUrl: link.targetUrl,
          totalClicks: 0,
          todayClicks: 0,
          uniqueClicks: 0,
          conversions: 0,
          isActive: link.isActive,
          createdAt: link.createdAt,
          trackingUrl,
          link: trackingUrl,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[traffic/links POST]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
