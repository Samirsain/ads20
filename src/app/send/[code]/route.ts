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

    // 1. Find TrafficLink by uniqueCode and verify active/non-deleted status
    const trafficLink = await prisma.trafficLink.findUnique({
      where: { uniqueCode: code },
    })

    if (!trafficLink || !trafficLink.isActive || trafficLink.isDeleted) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    const country =
      (
        request.headers.get('x-vercel-ip-country') ||
        request.headers.get('cf-ipcountry') ||
        request.headers.get('x-country-code') ||
        'Unknown'
      )
        .trim()
        .slice(0, 64) || 'Unknown'

    // 2. Check Redis + durable DB lookup for 24h duplicate click protection
    const redisKey = `traffic_click:${code}:${ip}`
    const keyExists = await redis.exists(redisKey)
    let isUnique = keyExists === 0
    if (isUnique && request.cookies.get(`t_clk_${code}`)?.value === '1') {
      isUnique = false
    } else if (isUnique) {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const recent = await prisma.trafficClick.findFirst({
        where: { trafficLinkId: trafficLink.id, ip, timestamp: { gte: since24h } },
        select: { id: true },
      })
      if (recent) isUnique = false
    }

    if (isUnique) {
      await redis.set(redisKey, '1', 'EX', 86400) // expire in 24 hours
    }

    // 3. Create TrafficClick record
    const device = parseUserAgent(userAgent)
    prisma.trafficClick
      .create({
        data: {
          trafficLinkId: trafficLink.id,
          ip,
          userAgent,
          country,
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

    // 5. Create redirect response and set cookie.
    // The `ref` param is what the destination site must send back on the
    // postback — the cookie below is set on our domain and is therefore not
    // readable cross-domain, so without this param traffic conversions can
    // never be attributed.
    const targetUrl = new URL(trafficLink.targetUrl)
    targetUrl.searchParams.set('ref', code)

    const response = NextResponse.redirect(targetUrl.toString())
    response.cookies.set('traffic_ref', code, {
      maxAge: 60 * 60 * 24, // 1 day
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
    response.cookies.set(`t_clk_${code}`, '1', {
      maxAge: 60 * 60 * 24,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })

    return response
  } catch (error) {
    console.error('[traffic redirect error]', error)
    return NextResponse.redirect(new URL('/', request.url))
  }
}
