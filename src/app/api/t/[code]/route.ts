import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rateLimit'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  // ── Rate limit by IP ──────────────────────────────────────────────────────
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'

  const { allowed } = checkRateLimit(ip, 10, 60 * 60 * 1000)
  if (!allowed) {
    return new Response('Too Many Requests', { status: 429 })
  }

  // ── Look up tracking link ─────────────────────────────────────────────────
  const link = await prisma.trackingLink.findUnique({
    where: { uniqueCode: code },
  })

  if (!link) {
    return new Response('Link not found', { status: 404 })
  }

  // ── Log the click ─────────────────────────────────────────────────────────
  const userAgent = request.headers.get('user-agent') ?? ''
  const referrer = request.headers.get('referer') ?? ''

  await Promise.all([
    prisma.click.create({
      data: {
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
  ])

  // ── Set ref_code cookie + redirect ────────────────────────────────────────
  const response = new Response(null, {
    status: 302,
    headers: {
      Location: link.targetUrl,
      'Set-Cookie': `ref_code=${code}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
    },
  })

  return response
}
