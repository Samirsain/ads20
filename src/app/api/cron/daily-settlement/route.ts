import { getAdminFromRequest } from '@/lib/apiAuth'
import { runNextDaySettlement } from '@/lib/settlement'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Scheduled Next-Day IST Settlement endpoint (e.g. triggered via Vercel Cron or external scheduler).
 * Protected by CRON_SECRET Bearer token or authenticated Admin session.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  const authHeader = request.headers.get('authorization')
  const isCronAuthorized = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`)
  const admin = isCronAuthorized ? null : getAdminFromRequest(request)

  if (!isCronAuthorized && !admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runNextDaySettlement({
      triggeredBy: isCronAuthorized ? 'CRON' : 'ADMIN',
      actorAdminId: admin?.adminId,
      actorEmail: admin?.email,
    })
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('[cron/daily-settlement]', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Settlement failed' },
      { status: 500 }
    )
  }
}

