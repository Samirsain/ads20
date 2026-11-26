import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { APP_TIMEZONE, dayRange, isDateStr } from '@/lib/appTime'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

function computeCpmRate(impressions: number, conversions: number): number {
  if (impressions === 0) return 0.5
  const convRate = (conversions / impressions) * 100
  return Math.max(0.5, Math.min(20, convRate))
}

interface ClickGroupRow {
  publisherId: string
  day: string
  total: bigint | number
  valid: bigint | number
}

interface ConvGroupRow {
  publisherId: string
  day: string
  count: bigint | number
  earnings: string | number | null
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

    const clickConds: Prisma.Sql[] = [Prisma.sql`1=1`]
    if (range?.gte) clickConds.push(Prisma.sql`"timestamp" >= ${range.gte}`)
    if (range?.lt) clickConds.push(Prisma.sql`"timestamp" < ${range.lt}`)
    if (publisherIdParam) clickConds.push(Prisma.sql`"publisherId" = ${publisherIdParam}`)

    const convConds: Prisma.Sql[] = [Prisma.sql`"isValid" = true`]
    if (range?.gte) convConds.push(Prisma.sql`"createdAt" >= ${range.gte}`)
    if (range?.lt) convConds.push(Prisma.sql`"createdAt" < ${range.lt}`)
    if (publisherIdParam) convConds.push(Prisma.sql`"publisherId" = ${publisherIdParam}`)

    const [publishers, clickGroups, convGroups, settlements] = await Promise.all([
      prisma.publisher.findMany({
        select: { id: true, name: true, email: true, walletBalance: true, reservedBalance: true },
      }),
      prisma.$queryRaw<ClickGroupRow[]>`
        SELECT
          "publisherId",
          to_char("timestamp" AT TIME ZONE ${APP_TIMEZONE}, 'YYYY-MM-DD') AS day,
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (WHERE "isValid" = true)::bigint AS valid
        FROM "Click"
        WHERE ${Prisma.join(clickConds, ' AND ')}
        GROUP BY 1, 2
      `,
      prisma.$queryRaw<ConvGroupRow[]>`
        SELECT
          "publisherId",
          to_char("createdAt" AT TIME ZONE ${APP_TIMEZONE}, 'YYYY-MM-DD') AS day,
          COUNT(*)::bigint AS count,
          COALESCE(SUM("amount"), 0)::text AS earnings
        FROM "Conversion"
        WHERE ${Prisma.join(convConds, ' AND ')}
        GROUP BY 1, 2
      `,
      prisma.dailySettlement.findMany({
        where: { accountType: 'PUBLISHER' },
        select: { accountId: true, settlementDate: true, status: true },
      }),
    ])

    const impMap = new Map(
      clickGroups.map((r) => [
        `${r.publisherId}|${r.day}`,
        { total: Number(r.total), valid: Number(r.valid) },
      ])
    )
    const convMap = new Map(
      convGroups.map((r) => [
        `${r.publisherId}|${r.day}`,
        { count: Number(r.count), earnings: Number(r.earnings ?? 0) },
      ])
    )
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
        const actualEarnings = parseFloat((convMap.get(key)?.earnings ?? 0).toFixed(4))
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
    console.error('[admin/publisher-earnings]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
