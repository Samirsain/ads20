import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rateLimit'
import { after } from 'next/server'
import { nanoid } from 'nanoid'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      '127.0.0.1'

    const { allowed } = checkRateLimit(ip, 10, 60 * 60 * 1000)
    if (!allowed) {
      return new Response('Too Many Requests', { status: 429 })
    }

    const link = await prisma.trackingLink.findUnique({
      where: { uniqueCode: code },
      select: { id: true, publisherId: true, targetUrl: true, isActive: true, isDeleted: true },
    })

    if (!link || !link.isActive || link.isDeleted) {
      return new Response('Link not found or inactive', { status: 404 })
    }

    const userAgent = request.headers.get('user-agent') ?? ''
    const referrer = request.headers.get('referer') ?? ''
    const country =
      (
        request.headers.get('x-vercel-ip-country') ||
        request.headers.get('cf-ipcountry') ||
        request.headers.get('x-country-code') ||
        'Unknown'
      )
        .trim()
        .slice(0, 64) || 'Unknown'

    // Server-side duplicate click protection (cookie + 24h IP lookup on this link)
    const hasClickCookie = request.cookies.get(`v_clk_${code}`)?.value === '1'
    let isDuplicate = hasClickCookie
    if (!isDuplicate) {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const recent = await prisma.click.findFirst({
        where: { trackingLinkId: link.id, ip, timestamp: { gte: since24h } },
        select: { id: true },
      })
      isDuplicate = Boolean(recent)
    }
    const isValid = !isDuplicate

    // Generated up front so it can travel to PaisaWin and back on the postback.
    const clickId = nanoid(16)

    // Runs after the redirect is sent — tracking never delays or blocks it
    after(() =>
      Promise.all([
        prisma.click.create({
          data: {
            id: clickId,
            trackingLinkId: link.id,
            publisherId: link.publisherId,
            ip,
            userAgent,
            referrer,
            country,
            isValid,
          },
        }),
        ...(isValid
          ? [
              prisma.trackingLink.update({
                where: { id: link.id },
                data: { clicks: { increment: 1 } },
              }),
            ]
          : []),
      ]).catch((err) => console.error('[tracking click error]', err))
    )

    // PaisaWin must store `ref` and `click_id` through registration and send
    // both back on the postback (an HttpOnly cookie here is not readable cross-domain)
    const targetUrl = new URL(link.targetUrl)
    targetUrl.searchParams.set('ref', code)
    targetUrl.searchParams.set('click_id', clickId)

    const headers = new Headers()
    headers.set('Location', targetUrl.toString())
    headers.append(
      'Set-Cookie',
      `ref_code=${code}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
    )
    headers.append(
      'Set-Cookie',
      `v_clk_${code}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24}`
    )

    return new Response(null, {
      status: 302,
      headers,
    })
  } catch (err) {
    console.error('[t/[code] route error]', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
