import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { reportRestoreSchema } from '@/lib/validators'
import { ReportClearError, restoreClearedReports } from '@/lib/reportArchive'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const body = await request.json()
    const parsed = reportRestoreSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const result = await restoreClearedReports({
      dates: parsed.data.dates,
      reason: parsed.data.reason,
      adminId: admin.adminId,
      adminEmail: admin.email,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof ReportClearError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    }
    console.error('[admin/reports/restore POST]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

