import { prisma } from '@/lib/prisma'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

function computeCpmRate(impressions: number, conversions: number): number {
  if (impressions === 0) return 0.5
  const convRate = (conversions / impressions) * 100
  return Math.max(0.5, Math.min(20, convRate))
}

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const dateParam = request.nextUrl.searchParams.get('date') // YYYY-MM-DD
    const publisherIdParam = request.nextUrl.searchParams.get('publisherId')

    const clickWhere: Record<string, any> = {}
    const convWhere: Record<string, any> = {}

    if (dateParam) {
      clickWhere.timestamp = {
        gte: new Date(`${dateParam}T00:00:00.000Z`),
        lt: new Date(`${dateParam}T23:59:59.999Z`),
      }
      convWhere.createdAt = {
        gte: new Date(`${dateParam}T00:00:00.000Z`),
        lt: new Date(`${dateParam}T23:59:59.999Z`),
      }
    }
    if (publisherIdParam) {
      clickWhere.publisherId = publisherIdParam
      convWhere.publisherId = publisherIdParam
    }

    const [publishers, clicks, conversions] = await Promise.all([
      prisma.publisher.findMany({ select: { id: true, name: true, email: true } }),
      prisma.click.findMany({ where: clickWhere, select: { publisherId: true, timestamp: true } }),
      prisma.conversion.findMany({ where: convWhere, select: { publisherId: true, createdAt: true } }),
    ])

    const impMap = new Map<string, number>()
    for (const c of clicks) {
      const date = c.timestamp.toISOString().slice(0, 10)
      const key = `${c.publisherId}|${date}`
      impMap.set(key, (impMap.get(key) ?? 0) + 1)
    }

    const convMap = new Map<string, number>()
    for (const c of conversions) {
      const date = c.createdAt.toISOString().slice(0, 10)
      const key = `${c.publisherId}|${date}`
      convMap.set(key, (convMap.get(key) ?? 0) + 1)
    }

    const pubById = Object.fromEntries(publishers.map(p => [p.id, p]))
    const allKeys = new Set([...impMap.keys(), ...convMap.keys()])

    const rows = Array.from(allKeys)
      .map(key => {
        const [publisherId, date] = key.split('|')
        const pub = pubById[publisherId]
        if (!pub) return null
        const imp = impMap.get(key) ?? 0
        const conv = convMap.get(key) ?? 0
        const cpmRate = computeCpmRate(imp, conv)
        const earnings = parseFloat(((imp / 1000) * cpmRate).toFixed(4))
        return { publisherId, publisherName: pub.name, publisherEmail: pub.email, date, impressions: imp, conversions: conv, cpmRate, earnings }
      })
      .filter(Boolean)
      .sort((a, b) => (b!.date > a!.date ? 1 : b!.date < a!.date ? -1 : 0))

    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error('[admin/publisher-earnings GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
