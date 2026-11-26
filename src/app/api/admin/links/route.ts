import { prisma } from '@/lib/prisma'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { dayRange, todayIST } from '@/lib/appTime'
import { getAppUrl } from '@/lib/appUrl'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const portal = request.nextUrl.searchParams.get('type') // 'publisher' | 'traffic' | null
    const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() || ''
    const today = todayIST()
    const todayBounds = dayRange(today, today)!
    const appUrl = getAppUrl(request)

    const [
      pubLinks,
      trafficLinks,
      pubTodayClicks,
      trafficTodayClicks,
      pubConvStats,
      trafficEarnStats,
    ] = await Promise.all([
      portal === 'traffic'
        ? Promise.resolve([])
        : prisma.trackingLink.findMany({
            orderBy: { createdAt: 'desc' },
            include: { publisher: { select: { id: true, name: true, email: true } } },
          }),
      portal === 'publisher'
        ? Promise.resolve([])
        : prisma.trafficLink.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, name: true, email: true } } },
          }),
      portal === 'traffic'
        ? Promise.resolve([])
        : prisma.click.groupBy({
            by: ['trackingLinkId'],
            where: { isValid: true, timestamp: todayBounds },
            _count: { _all: true },
          }),
      portal === 'publisher'
        ? Promise.resolve([])
        : prisma.trafficClick.groupBy({
            by: ['trafficLinkId'],
            where: { timestamp: todayBounds },
            _count: { _all: true },
          }),
      portal === 'traffic'
        ? Promise.resolve([])
        : prisma.conversion.groupBy({
            by: ['trackingLinkId'],
            where: { isValid: true },
            _count: { _all: true },
            _sum: { amount: true },
          }),
      portal === 'publisher'
        ? Promise.resolve([])
        : prisma.trafficEarning.groupBy({
            by: ['trafficLinkId'],
            where: { isValid: true },
            _count: { _all: true },
            _sum: { amount: true },
          }),
    ])

    const pubTodayMap = new Map(pubTodayClicks.map((r) => [r.trackingLinkId, r._count._all]))
    const trafficTodayMap = new Map(trafficTodayClicks.map((r) => [r.trafficLinkId, r._count._all]))
    const pubConvMap = new Map(
      pubConvStats.map((r) => [
        r.trackingLinkId,
        { count: r._count._all, earnings: Number(r._sum.amount ?? 0) },
      ])
    )
    const trafficEarnMap = new Map(
      trafficEarnStats.map((r) => [
        r.trafficLinkId,
        { count: r._count._all, earnings: Number(r._sum.amount ?? 0) },
      ])
    )

    const items = [
      ...pubLinks.map((l) => {
        const stats = pubConvMap.get(l.id) ?? { count: 0, earnings: 0 }
        return {
          id: l.id,
          portal: 'publisher' as const,
          name: l.name,
          uniqueCode: l.uniqueCode,
          trackingUrl: `${appUrl}/t/${l.uniqueCode}`,
          targetUrl: l.targetUrl,
          linkType: l.linkType,
          totalClicks: l.clicks,
          todayClicks: pubTodayMap.get(l.id) ?? 0,
          conversions: stats.count,
          earnings: parseFloat(stats.earnings.toFixed(4)),
          isActive: l.isActive,
          isDeleted: l.isDeleted,
          createdAt: l.createdAt,
          owner: l.publisher,
        }
      }),
      ...trafficLinks.map((l) => {
        const stats = trafficEarnMap.get(l.id) ?? { count: l.conversions, earnings: 0 }
        return {
          id: l.id,
          portal: 'traffic' as const,
          name: l.name,
          uniqueCode: l.uniqueCode,
          trackingUrl: `${appUrl}/send/${l.uniqueCode}`,
          targetUrl: l.targetUrl,
          linkType: 'traffic',
          totalClicks: l.totalClicks,
          todayClicks: trafficTodayMap.get(l.id) ?? 0,
          conversions: stats.count,
          earnings: parseFloat(stats.earnings.toFixed(4)),
          isActive: l.isActive,
          isDeleted: l.isDeleted,
          createdAt: l.createdAt,
          owner: l.user,
        }
      }),
    ]
      .filter((item) => {
        if (!q) return true
        return (
          item.name.toLowerCase().includes(q) ||
          item.uniqueCode.toLowerCase().includes(q) ||
          item.targetUrl.toLowerCase().includes(q) ||
          item.owner.name.toLowerCase().includes(q) ||
          item.owner.email.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // User-wise rollups
    const userSummaryMap = new Map<
      string,
      { ownerId: string; ownerName: string; ownerEmail: string; portal: 'publisher' | 'traffic'; linkCount: number; activeLinks: number; totalClicks: number; totalEarnings: number }
    >()
    for (const item of items) {
      const key = `${item.portal}:${item.owner.id}`
      const cur = userSummaryMap.get(key) ?? {
        ownerId: item.owner.id,
        ownerName: item.owner.name,
        ownerEmail: item.owner.email,
        portal: item.portal,
        linkCount: 0,
        activeLinks: 0,
        totalClicks: 0,
        totalEarnings: 0,
      }
      cur.linkCount += 1
      if (item.isActive && !item.isDeleted) cur.activeLinks += 1
      cur.totalClicks += item.totalClicks
      cur.totalEarnings = parseFloat((cur.totalEarnings + item.earnings).toFixed(4))
      userSummaryMap.set(key, cur)
    }

    return NextResponse.json({
      success: true,
      data: {
        links: items,
        userSummaries: Array.from(userSummaryMap.values()).sort((a, b) => b.totalClicks - a.totalClicks),
      },
    })
  } catch (error) {
    console.error('[admin/links GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

