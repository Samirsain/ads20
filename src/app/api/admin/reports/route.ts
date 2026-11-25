import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { getDateWiseTrafficReports } from '@/lib/reportArchive'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD&dates=2026-11-23,2026-11-24&includeCleared=false&onlyCleared=false&publisherId=
export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const params = request.nextUrl.searchParams
    const datesParam = params.get('dates')?.trim()
    const dates = datesParam ? datesParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined
    const from = params.get('from')
    const to = params.get('to')
    const includeCleared = params.get('includeCleared') === 'true'
    const onlyCleared = params.get('onlyCleared') === 'true'
    const publisherId = params.get('publisherId')?.trim() || null

    const data = await getDateWiseTrafficReports({
      dates,
      from,
      to,
      includeCleared,
      onlyCleared,
      publisherId,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[admin/reports GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

