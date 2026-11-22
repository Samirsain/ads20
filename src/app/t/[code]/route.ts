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
    })

    if (!link) {
      return new Response('Link not found', { status: 404 })
    }

    const userAgent = request.headers.get('user-agent') ?? ''
    const referrer = request.headers.get('referer') ?? ''
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
          },
        }),
        prisma.trackingLink.update({
          where: { id: link.id },
          data: { clicks: { increment: 1 } },
        }),
      ]).catch((err) => console.error('[tracking click error]', err))
    )

    // PaisaWin must store `ref` and `click_id` through registration and send
    // both back on the postback (an HttpOnly cookie here is not readable cross-domain)
    const targetUrl = new URL(link.targetUrl)
    targetUrl.searchParams.set('ref', code)
    targetUrl.searchParams.set('click_id', clickId)

    return new Response(null, {
      status: 302,
      headers: {
        Location: targetUrl.toString(),
        'Set-Cookie': `ref_code=${code}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
      },
    })
  } catch (err) {
    console.error('[t/[code] route error]', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
