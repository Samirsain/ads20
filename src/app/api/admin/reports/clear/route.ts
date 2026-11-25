import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { reportClearExecuteSchema, reportClearPreviewSchema } from '@/lib/validators'
import { executeReportClear, previewReportClear, ReportClearError } from '@/lib/reportArchive'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const body = await request.json()
    const action = body?.action

    if (action === 'preview') {
      const parsed = reportClearPreviewSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.issues[0].message },
          { status: 400 }
        )
      }
      const preview = await previewReportClear(parsed.data.dates)
      return NextResponse.json({ success: true, data: preview })
    }

    if (action === 'execute') {
      const parsed = reportClearExecuteSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.issues[0].message },
          { status: 400 }
        )
      }
      const result = await executeReportClear({
        dates: parsed.data.dates,
        reason: parsed.data.reason,
        adminId: admin.adminId,
        adminEmail: admin.email,
        confirmedLargeRange: parsed.data.confirmedLargeRange,
      })

      return NextResponse.json({ success: true, data: result })
    }

    return NextResponse.json({ success: false, error: 'Invalid action (expected preview or execute)' }, { status: 400 })
  } catch (error) {
    if (error instanceof ReportClearError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    }
    console.error('[admin/reports/clear POST]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

