import { prisma } from '@/lib/prisma'
import { getPublisherFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { createLinkSchema } from '@/lib/validators'
import { getAppUrl } from '@/lib/appUrl'
import { getPublisherLinkList } from '@/lib/linkAnalytics'
import { nanoid } from 'nanoid'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/publisher/links — list active/non-deleted tracking links with todayClicks & earnings
export async function GET(request: NextRequest) {
  try {
    const publisher = getPublisherFromRequest(request)
    if (!publisher) return unauthorizedResponse()

    const appUrl = getAppUrl(request)
    const data = await getPublisherLinkList(publisher.publisherId, appUrl)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[publisher/links GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/publisher/links — create a new named tracking link
export async function POST(request: NextRequest) {
  try {
    const publisher = getPublisherFromRequest(request)
    if (!publisher) return unauthorizedResponse()

    let body = {}
    try {
      body = await request.json()
    } catch {
      // Empty body allowed when defaults are used
    }

    const result = createLinkSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { linkType, name: rawName, targetUrl: customTargetUrl } = result.data

    let targetUrl = customTargetUrl?.trim()
    if (!targetUrl) {
      const config = await prisma.globalConfig.findUnique({
        where: { key: 'landing_page_url' },
      })
      targetUrl = config?.value ?? 'https://paisawin.online/register'
    }

    const uniqueCode = nanoid(8)
    const name = rawName?.trim() || `Link ${uniqueCode}`
    const appUrl = getAppUrl(request)

    const link = await prisma.trackingLink.create({
      data: {
        publisherId: publisher.publisherId,
        name,
        uniqueCode,
        targetUrl,
        linkType,
        isActive: true,
        isDeleted: false,
      },
    })

    const trackingUrl = `${appUrl}/t/${uniqueCode}`

    return NextResponse.json(
      {
        success: true,
        data: {
          id: link.id,
          name: link.name,
          uniqueCode: link.uniqueCode,
          targetUrl: link.targetUrl,
          linkType: link.linkType,
          clicks: 0,
          todayClicks: 0,
          earnings: 0,
          isActive: link.isActive,
          createdAt: link.createdAt,
          trackingUrl,
          link: trackingUrl,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[publisher/links POST]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
