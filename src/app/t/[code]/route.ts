import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    // 1. Find TrackingLink by uniqueCode
    const trackingLink = await prisma.trackingLink.findUnique({
      where: { uniqueCode: code },
    })

    // 2. If not found → redirect to homepage
    if (!trackingLink) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // 3. Increment clicks (non-blocking)
    prisma.trackingLink
      .update({
        where: { id: trackingLink.id },
        data: { clicks: { increment: 1 } },
      })
      .catch((err) => console.error('Failed to increment clicks:', err))

    // 4. Create redirect response
    const response = NextResponse.redirect(trackingLink.targetUrl)

    // 5. Set cookie
    response.cookies.set('pub_ref', code, {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    })

    return response
  } catch (error) {
    console.error('[publisher redirect error]', error)
    return NextResponse.redirect(new URL('/', request.url))
  }
}
