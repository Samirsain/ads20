import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { parseUserAgent } from '@/lib/device'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // 1. Find TrafficLink by uniqueCode and verify active status
    const trafficLink = await prisma.trafficLink.findUnique({
      where: { uniqueCode: code },
    })

    if (!trafficLink || !trafficLink.isActive) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // 2. Check Redis key for uniqueness over 24h
    const redisKey = `traffic_click:${code}:${ip}`
    const keyExists = await redis.exists(redisKey)
    const isUnique = keyExists === 0

    if (isUnique) {
      await redis.set(redisKey, '1', 'EX', 86400) // expire in 24 hours
    }

    // 3. Create TrafficClick record (fire and forget / async to keep redirect fast)
    const device = parseUserAgent(userAgent)
    prisma.trafficClick
      .create({
        data: {
          trafficLinkId: trafficLink.id,
          ip,
          userAgent,
          isUnique,
          device,
        },
      })
      .catch((err) => console.error('Failed to save traffic click:', err))

    // 4. Update TrafficLink counts
    prisma.trafficLink
      .update({
        where: { id: trafficLink.id },
        data: {
          totalClicks: { increment: 1 },
          ...(isUnique && { uniqueClicks: { increment: 1 } }),
        },
      })
      .catch((err) => console.error('Failed to update traffic link counts:', err))

    // 5. Create redirect response and set cookie
    const response = NextResponse.redirect(trafficLink.targetUrl)
    response.cookies.set('traffic_ref', code, {
      maxAge: 60 * 60 * 24, // 1 day
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    })

    return response
  } catch (error) {
    console.error('[traffic redirect error]', error)
    return NextResponse.redirect(new URL('/', request.url))
  }
}
