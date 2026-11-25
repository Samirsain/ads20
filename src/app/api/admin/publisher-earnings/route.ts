import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { APP_TIMEZONE, dateIn, dayRange, isDateStr } from '@/lib/appTime'
import { microsToNumber, toMicros } from '@/lib/money'
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

    const params = request.nextUrl.searchParams
    const dateParam = params.get('date')
    const fromParam = params.get('from')
    const toParam = params.get('to')
    const publisherIdParam = params.get('publisherId')?.trim() || undefined

    const range = isDateStr(dateParam)
      ? dayRange(dateParam, dateParam)
      : dayRange(fromParam, toParam)

    const clickWhere: Prisma.ClickWhereInput = {
      ...(range && { timestamp: range }),
      ...(publisherIdParam && { publisherId: publisherIdParam }),
    }
    const convWhere: Prisma.ConversionWhereInput = {
      isValid: true,
      ...(range && { createdAt: range }),
      ...(publisherIdParam && { publisherId: publisherIdParam }),
    }

    const [publishers, clicks, conversions, settlements] = await Promise.all([
      prisma.publisher.findMany({
        select: { id: true, name: true, email: true, walletBalance: true, reservedBalance: true },
      }),
      prisma.click.findMany({
        where: clickWhere,
        select: { publisherId: true, isValid: true, timestamp: true },
      }),
      prisma.conversion.findMany({
        where: convWhere,
        select: { publisherId: true, amount: true, settlementId: true, createdAt: true },
      }),
      prisma.dailySettlement.findMany({
        where: { accountType: 'PUBLISHER' },
        select: { accountId: true, settlementDate: true, status: true },
      }),
    ])

    const impMap = new Map<string, { total: number; valid: number }>()
    for (const c of clicks) {
      const date = dateIn(c.timestamp)
      const key = `${c.publisherId}|${date}`
      const cur = impMap.get(key) ?? { total: 0, valid: 0 }
      cur.total += 1
      if (c.isValid) cur.valid += 1
      impMap.set(key, cur)
    }

    const convMap = new Map<string, { count: number; micros: bigint }>()
    for (const c of conversions) {
      const date = dateIn(c.createdAt)
      const key = `${c.publisherId}|${date}`
      const cur = convMap.get(key) ?? { count: 0, micros: 0n }
      cur.count += 1
      cur.micros += toMicros(c.amount)
      convMap.set(key, cur)
    }

    const settlementMap = new Map(
      settlements.map((s) => [`${s.accountId}|${s.settlementDate}`, s.status])
    )
    const pubById = Object.fromEntries(publishers.map((p) => [p.id, p]))
    const allKeys = new Set([...impMap.keys(), ...convMap.keys()])

    const rows = Array.from(allKeys)
      .map((key) => {
        const [publisherId, date] = key.split('|')
        const pub = pubById[publisherId]
        if (!pub) return null
        const imp = impMap.get(key)?.total ?? 0
        const validClicks = impMap.get(key)?.valid ?? 0
        const conv = convMap.get(key)?.count ?? 0
        const actualEarnings = microsToNumber(convMap.get(key)?.micros ?? 0n, 4)
        const cpmRate = computeCpmRate(imp, conv)
        return {
          publisherId,
          publisherName: pub.name,
          publisherEmail: pub.email,
          availableBalance: Number(pub.walletBalance),
          pendingBalance: Number(pub.reservedBalance),
          date,
          impressions: imp,
          validClicks,
          conversions: conv,
          cpmRate,
          earnings: actualEarnings,
          settlementStatus:
            settlementMap.get(`${publisherId}|${date}`) ??
            (actualEarnings > 0 ? 'PENDING_SETTLEMENT' : 'NONE'),
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : b.earnings - a.earnings))

    return NextResponse.json({
      success: true,
      timezone: APP_TIMEZONE,
      data: rows,
    })
  } catch (error) {
    console.error('[admin/publisher-earnings GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
