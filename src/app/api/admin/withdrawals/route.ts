import { prisma } from '@/lib/prisma'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { paginationSchema } from '@/lib/validators'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')?.trim() || undefined
    const type = searchParams.get('type') // publisher | traffic | undefined
    const search = searchParams.get('q')?.trim().toLowerCase() || ''
    const parsed = paginationSchema.safeParse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? 50,
    })
    const { page, limit } = parsed.success ? parsed.data : { page: 1, limit: 50 }

    const statusFilter = status ? { status } : {}

    const [publisherWithdrawals, trafficWithdrawals, historyRows] = await Promise.all([
      type === 'traffic'
        ? Promise.resolve([])
        : prisma.pubWithdrawal.findMany({
            where: statusFilter,
            orderBy: { requestedAt: 'desc' },
            include: {
              publisher: { select: { id: true, email: true, name: true, walletBalance: true, reservedBalance: true } },
            },
          }),
      type === 'publisher'
        ? Promise.resolve([])
        : prisma.trafficWithdrawal.findMany({
            where: statusFilter,
            orderBy: { requestedAt: 'desc' },
            include: {
              user: { select: { id: true, email: true, name: true, walletBalance: true, reservedBalance: true } },
            },
          }),
      prisma.withdrawalStatusHistory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 250,
      }),
    ])

    const historyByWithdrawal = new Map<string, typeof historyRows>()
    for (const h of historyRows) {
      const list = historyByWithdrawal.get(h.withdrawalId) ?? []
      list.push(h)
      historyByWithdrawal.set(h.withdrawalId, list)
    }

    const filterMatch = (name?: string | null, email?: string | null, wallet?: string | null, txRef?: string | null) => {
      if (!search) return true
      return (
        (name?.toLowerCase().includes(search) ?? false) ||
        (email?.toLowerCase().includes(search) ?? false) ||
        (wallet?.toLowerCase().includes(search) ?? false) ||
        (txRef?.toLowerCase().includes(search) ?? false)
      )
    }

    const filteredPub = publisherWithdrawals
      .filter((w) => filterMatch(w.publisher?.name, w.publisher?.email, w.walletAddress, w.txReference))
      .map((w) => ({ ...w, history: historyByWithdrawal.get(w.id) ?? [] }))

    const filteredTraffic = trafficWithdrawals
      .filter((w) => filterMatch(w.user?.name, w.user?.email, w.walletAddress, w.txReference))
      .map((w) => ({ ...w, history: historyByWithdrawal.get(w.id) ?? [] }))

    const start = (page - 1) * limit
    if (type === 'publisher') {
      return NextResponse.json({
        success: true,
        data: filteredPub.slice(start, start + limit),
        pagination: { page, limit, total: filteredPub.length, pages: Math.ceil(filteredPub.length / limit) },
      })
    }

    if (type === 'traffic') {
      return NextResponse.json({
        success: true,
        data: filteredTraffic.slice(start, start + limit),
        pagination: { page, limit, total: filteredTraffic.length, pages: Math.ceil(filteredTraffic.length / limit) },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        publisher: filteredPub.slice(start, start + limit),
        traffic: filteredTraffic.slice(start, start + limit),
      },
      totals: {
        publisher: filteredPub.length,
        traffic: filteredTraffic.length,
      },
    })
  } catch (error) {
    console.error('[admin/withdrawals GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
