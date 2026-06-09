import { prisma } from '@/lib/prisma'
import { getTrafficUserFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { createTrafficLinkSchema } from '@/lib/validators'
import { nanoid } from 'nanoid'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/traffic/links — list traffic links with aggregate stats
export async function GET(request: NextRequest) {
  try {
    const user = getTrafficUserFromRequest(request)
    if (!user) return unauthorizedResponse()

    const links = await prisma.trafficLink.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        earnings: {
          select: { amount: true }
        }
      }
    })

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

    const data = links.map((link) => {
      const earned = link.earnings.reduce((sum, e) => sum + Number(e.amount), 0)

      return {
        id: link.id,
        uniqueCode: link.uniqueCode,
        targetUrl: link.targetUrl,
        totalClicks: link.totalClicks,
        uniqueClicks: link.uniqueClicks,
        conversions: link.conversions,
        isActive: link.isActive,
        createdAt: link.createdAt,
        trackingUrl: `${appUrl}/send/${link.uniqueCode}`,
        earned,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[traffic/links GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/traffic/links — create a new traffic link
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

    const { targetUrl } = result.data
    const uniqueCode = nanoid(10)
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

    const link = await prisma.trafficLink.create({
      data: {
        userId: user.userId,
        uniqueCode,
        targetUrl,
        isActive: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          id: link.id,
          uniqueCode: link.uniqueCode,
          targetUrl: link.targetUrl,
          totalClicks: 0,
          uniqueClicks: 0,
          conversions: 0,
          isActive: link.isActive,
          createdAt: link.createdAt,
          link: `${appUrl}/send/${uniqueCode}`,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[traffic/links POST]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
