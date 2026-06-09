import { prisma } from '@/lib/prisma'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status') || undefined // e.g. PENDING, PAID, REJECTED
    const type = searchParams.get('type') // publisher or traffic

    const statusFilter = status ? { status } : {}

    if (type === 'publisher') {
      const withdrawals = await prisma.pubWithdrawal.findMany({
        where: statusFilter,
        orderBy: { requestedAt: 'desc' },
        include: {
          publisher: {
            select: { id: true, email: true, name: true }
          }
        }
      })
      return NextResponse.json({ success: true, data: withdrawals })
    }

    if (type === 'traffic') {
      const withdrawals = await prisma.trafficWithdrawal.findMany({
        where: statusFilter,
        orderBy: { requestedAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, name: true }
          }
        }
      })
      return NextResponse.json({ success: true, data: withdrawals })
    }

    // If no type specified, fetch both and return combined or as separate properties
    const [publisherWithdrawals, trafficWithdrawals] = await Promise.all([
      prisma.pubWithdrawal.findMany({
        where: statusFilter,
        orderBy: { requestedAt: 'desc' },
        include: {
          publisher: {
            select: { id: true, email: true, name: true }
          }
        }
      }),
      prisma.trafficWithdrawal.findMany({
        where: statusFilter,
        orderBy: { requestedAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, name: true }
          }
        }
      })
    ])

    return NextResponse.json({
      success: true,
      data: {
        publisher: publisherWithdrawals,
        traffic: trafficWithdrawals
      }
    })
  } catch (error) {
    console.error('[admin/withdrawals GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
