import { prisma } from '@/lib/prisma'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const backupId = request.nextUrl.searchParams.get('id')?.trim()
    if (backupId) {
      const backup = await prisma.trafficReportBackup.findUnique({
        where: { id: backupId },
      })
      if (!backup) {
        return NextResponse.json({ success: false, error: 'Backup not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true, data: backup })
    }

    const [backups, auditLogs] = await Promise.all([
      prisma.trafficReportBackup.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          reportDates: true,
          portalScope: true,
          checksumSha256: true,
          recordCount: true,
          verifiedAt: true,
          createdByAdminId: true,
          createdAt: true,
        },
      }),
      prisma.adminAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: { backups, auditLogs },
    })
  } catch (error) {
    console.error('[admin/reports/backups GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

