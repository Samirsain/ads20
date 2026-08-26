import { prisma } from '@/lib/prisma'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { POSTBACK_LOG_KEY, readEntries } from '@/lib/postbackLog'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/admin/postback-log — recent postback attempts received from external platforms
export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const config = await prisma.globalConfig.findUnique({
      where: { key: POSTBACK_LOG_KEY },
    })

    return NextResponse.json({ success: true, data: readEntries(config?.value) })
  } catch (error) {
    console.error('[admin/postback-log GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/postback-log — clear the log
export async function DELETE(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    await prisma.globalConfig.upsert({
      where: { key: POSTBACK_LOG_KEY },
      update: { value: '[]' },
      create: { key: POSTBACK_LOG_KEY, value: '[]' },
    })

    return NextResponse.json({ success: true, data: [] })
  } catch (error) {
    console.error('[admin/postback-log DELETE]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
