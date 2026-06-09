import { prisma } from '@/lib/prisma'
import { getPublisherFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { createLinkSchema } from '@/lib/validators'
import { nanoid } from 'nanoid'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/publisher/links — list all tracking links
export async function GET(request: NextRequest) {
  try {
    const publisher = getPublisherFromRequest(request)
    if (!publisher) return unauthorizedResponse()

    const links = await prisma.trackingLink.findMany({
      where: { publisherId: publisher.publisherId },
      orderBy: { createdAt: 'desc' },
      include: {
        conversions: {
          select: { amount: true }
        }
      }
    })

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

    const data = links.map((link) => {
      const conversionsCount = link.conversions.length
      const earned = link.conversions.reduce((sum, c) => sum + Number(c.amount), 0)

      return {
        id: link.id,
        uniqueCode: link.uniqueCode,
        targetUrl: link.targetUrl,
        linkType: link.linkType,
        clicks: link.clicks,
        createdAt: link.createdAt,
        trackingUrl: `${appUrl}/t/${link.uniqueCode}`,
        conversions: conversionsCount,
        earned,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[publisher/links GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/publisher/links — create a new tracking link
export async function POST(request: NextRequest) {
  try {
    const publisher = getPublisherFromRequest(request)
    if (!publisher) return unauthorizedResponse()

    let body = {}
    try {
      body = await request.json()
    } catch {
      // Empty body allowed since all fields are optional or have defaults
    }

    const result = createLinkSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { linkType } = result.data

    // Get landing page url from global config
    const config = await prisma.globalConfig.findUnique({
      where: { key: 'landing_page_url' },
    })
    const targetUrl = config?.value ?? 'https://paisawin.online/register'

    const uniqueCode = nanoid(10)
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

    const link = await prisma.trackingLink.create({
      data: {
        publisherId: publisher.publisherId,
        uniqueCode,
        targetUrl,
        linkType,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          id: link.id,
          uniqueCode: link.uniqueCode,
          targetUrl: link.targetUrl,
          linkType: link.linkType,
          clicks: 0,
          createdAt: link.createdAt,
          link: `${appUrl}/t/${uniqueCode}`,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[publisher/links POST]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
