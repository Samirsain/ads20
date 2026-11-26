import { prisma } from '@/lib/prisma'
import { APP_TIMEZONE, addDays, dayRange, todayIST, yesterdayIST } from '@/lib/appTime'

function computeCpmRate(impressions: number, actions: number): number {
  if (impressions === 0) return 0.5
  const convRate = (actions / impressions) * 100
  return Math.max(0.5, Math.min(20, convRate))
}

export interface PublisherLinkRow {
  id: string
  name: string
  uniqueCode: string
  targetUrl: string
  linkType: string
  clicks: number
  todayClicks: number
  cpmRate: number
  earnings: number
  isActive: boolean
  createdAt: Date
  trackingUrl: string
}

export async function getPublisherLinkList(publisherId: string, appUrl: string): Promise<PublisherLinkRow[]> {
  const today = todayIST()
  const todayBounds = dayRange(today, today)!

  const [links, todayClickAgg, convTotals] = await Promise.all([
    prisma.trackingLink.findMany({
      where: { publisherId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        uniqueCode: true,
        targetUrl: true,
        linkType: true,
        clicks: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.click.groupBy({
      by: ['trackingLinkId'],
      where: {
        publisherId,
        isValid: true,
        timestamp: todayBounds,
      },
      _count: { _all: true },
    }),
    prisma.conversion.groupBy({
      by: ['trackingLinkId'],
      where: {
        publisherId,
        isValid: true,
      },
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ])

  const todayMap = new Map(todayClickAgg.map((r) => [r.trackingLinkId, r._count._all]))
  const convMap = new Map(
    convTotals.map((r) => [
      r.trackingLinkId,
      { count: r._count._all, amount: Number(r._sum.amount ?? 0) },
    ])
  )

  return links.map((link) => {
    const todayClicks = todayMap.get(link.id) ?? 0
    const conv = convMap.get(link.id) ?? { count: 0, amount: 0 }
    const impressions = link.clicks
    const cpmRate = computeCpmRate(impressions, conv.count)
    // Show actual attributed valid earnings when conversions exist, fallback-free
    const earnings = parseFloat(conv.amount.toFixed(4))

    return {
      id: link.id,
      name: link.name,
      uniqueCode: link.uniqueCode,
      targetUrl: link.targetUrl,
      linkType: link.linkType,
      clicks: impressions,
      todayClicks,
      cpmRate,
      earnings,
      isActive: link.isActive,
      createdAt: link.createdAt,
      trackingUrl: `${appUrl}/t/${link.uniqueCode}`,
    }
  })
}

export async function getTrafficLinkList(userId: string, appUrl: string) {
  const today = todayIST()
  const todayBounds = dayRange(today, today)!

  const [links, todayClickAgg, earnTotals] = await Promise.all([
    prisma.trafficLink.findMany({
      where: { userId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        uniqueCode: true,
        targetUrl: true,
        totalClicks: true,
        uniqueClicks: true,
        conversions: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.trafficClick.groupBy({
      by: ['trafficLinkId'],
      where: {
        trafficLink: { userId },
        timestamp: todayBounds,
      },
      _count: { _all: true },
    }),
    prisma.trafficEarning.groupBy({
      by: ['trafficLinkId'],
      where: { userId, isValid: true },
      _sum: { amount: true },
    }),
  ])

  const todayMap = new Map(todayClickAgg.map((r) => [r.trafficLinkId, r._count._all]))
  const earnMap = new Map(earnTotals.map((r) => [r.trafficLinkId, Number(r._sum.amount ?? 0)]))

  return links.map((link) => ({
    id: link.id,
    name: link.name,
    uniqueCode: link.uniqueCode,
    targetUrl: link.targetUrl,
    totalClicks: link.totalClicks,
    todayClicks: todayMap.get(link.id) ?? 0,
    uniqueClicks: link.uniqueClicks,
    conversions: link.conversions,
    isActive: link.isActive,
    createdAt: link.createdAt,
    trackingUrl: `${appUrl}/send/${link.uniqueCode}`,
    earned: parseFloat((earnMap.get(link.id) ?? 0).toFixed(4)),
  }))
}

interface DailyAggRow {
  day: string
  clicks: bigint | number
  valid_clicks?: bigint | number
}

interface DailyEarnAggRow {
  day: string
  conversions: bigint | number
  earnings: string | number | null
}

interface CountryAggRow {
  country: string | null
  clicks: bigint | number
}

export async function getLinkAnalytics(opts: {
  linkId: string
  portal: 'publisher' | 'traffic'
  ownerId?: string
  includeAdminConversionCounts: boolean
  appUrl: string
}) {
  const today = todayIST()
  const yesterday = yesterdayIST()
  const todayBounds = dayRange(today, today)!
  const yesterdayBounds = dayRange(yesterday, yesterday)!
  const since14 = dayRange(addDays(today, -13), today)!

  if (opts.portal === 'publisher') {
    const link = await prisma.trackingLink.findUnique({
      where: { id: opts.linkId },
      include: { publisher: { select: { id: true, name: true, email: true } } },
    })
    if (!link) return null
    if (opts.ownerId && (link.publisherId !== opts.ownerId || link.isDeleted)) return null

    const [
      todayClicks,
      yesterdayClicks,
      dailyClickRows,
      dailyEarnRows,
      countryRows,
    ] = await Promise.all([
      prisma.click.count({
        where: { trackingLinkId: link.id, isValid: true, timestamp: todayBounds },
      }),
      prisma.click.count({
        where: { trackingLinkId: link.id, isValid: true, timestamp: yesterdayBounds },
      }),
      prisma.$queryRaw<DailyAggRow[]>`
        SELECT
          to_char("timestamp" AT TIME ZONE ${APP_TIMEZONE}, 'YYYY-MM-DD') AS day,
          COUNT(*)::bigint AS clicks,
          COUNT(*) FILTER (WHERE "isValid" = true)::bigint AS valid_clicks
        FROM "Click"
        WHERE "trackingLinkId" = ${link.id}
          AND "timestamp" >= ${since14.gte}
        GROUP BY 1
        ORDER BY 1 DESC
      `,
      prisma.$queryRaw<DailyEarnAggRow[]>`
        SELECT
          to_char("createdAt" AT TIME ZONE ${APP_TIMEZONE}, 'YYYY-MM-DD') AS day,
          COUNT(*)::bigint AS conversions,
          COALESCE(SUM("amount"), 0)::text AS earnings
        FROM "Conversion"
        WHERE "trackingLinkId" = ${link.id}
          AND "isValid" = true
        GROUP BY 1
        ORDER BY 1 DESC
      `,
      prisma.$queryRaw<CountryAggRow[]>`
        SELECT
          COALESCE(NULLIF(TRIM("country"), ''), 'Unknown') AS country,
          COUNT(*)::bigint AS clicks
        FROM "Click"
        WHERE "trackingLinkId" = ${link.id}
          AND "isValid" = true
        GROUP BY 1
        ORDER BY clicks DESC
        LIMIT 25
      `,
    ])

    const clickByDay = new Map(
      dailyClickRows.map((r) => [
        r.day,
        { clicks: Number(r.clicks), validClicks: Number(r.valid_clicks ?? r.clicks) },
      ])
    )
    const earnByDay = new Map(
      dailyEarnRows.map((r) => [
        r.day,
        { conversions: Number(r.conversions), earnings: Number(r.earnings ?? 0) },
      ])
    )

    const allDates = new Set<string>()
    for (let i = 13; i >= 0; i--) allDates.add(addDays(today, -i))
    for (const d of clickByDay.keys()) allDates.add(d)
    for (const d of earnByDay.keys()) allDates.add(d)

    let totalEarn = 0
    let totalConv = 0
    for (const e of earnByDay.values()) {
      totalEarn += e.earnings
      totalConv += e.conversions
    }

    const dailySeries = Array.from(allDates)
      .sort()
      .reverse()
      .map((date) => {
        const c = clickByDay.get(date)
        const e = earnByDay.get(date)
        return {
          date,
          clicks: c?.validClicks ?? 0,
          rawClicks: c?.clicks ?? 0,
          earnings: parseFloat((e?.earnings ?? 0).toFixed(4)),
          ...(opts.includeAdminConversionCounts ? { conversions: e?.conversions ?? 0 } : {}),
        }
      })

    const totalCountryClicks = countryRows.reduce((s, r) => s + Number(r.clicks), 0)
    const countryStats = countryRows.map((r) => {
      const clicks = Number(r.clicks)
      return {
        country: r.country || 'Unknown',
        clicks,
        percentage: totalCountryClicks > 0 ? parseFloat(((clicks / totalCountryClicks) * 100).toFixed(1)) : 0,
      }
    })

    return {
      portal: 'publisher' as const,
      timezone: APP_TIMEZONE,
      link: {
        id: link.id,
        name: link.name,
        uniqueCode: link.uniqueCode,
        trackingUrl: `${opts.appUrl}/t/${link.uniqueCode}`,
        targetUrl: link.targetUrl,
        linkType: link.linkType,
        isActive: link.isActive,
        isDeleted: link.isDeleted,
        createdAt: link.createdAt,
        ...(opts.includeAdminConversionCounts
          ? { owner: { id: link.publisher.id, name: link.publisher.name, email: link.publisher.email } }
          : {}),
      },
      metrics: {
        totalClicks: link.clicks,
        todayClicks,
        yesterdayClicks,
        totalEarnings: parseFloat(totalEarn.toFixed(4)),
        cpmRate: computeCpmRate(link.clicks, totalConv),
        ...(opts.includeAdminConversionCounts ? { totalConversions: totalConv } : {}),
      },
      countryStats,
      dailySeries,
    }
  }

  // Traffic portal link analytics
  const link = await prisma.trafficLink.findUnique({
    where: { id: opts.linkId },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  if (!link) return null
  if (opts.ownerId && (link.userId !== opts.ownerId || link.isDeleted)) return null

  const [todayClicks, yesterdayClicks, dailyClickRows, dailyEarnRows, countryRows] = await Promise.all([
    prisma.trafficClick.count({
      where: { trafficLinkId: link.id, timestamp: todayBounds },
    }),
    prisma.trafficClick.count({
      where: { trafficLinkId: link.id, timestamp: yesterdayBounds },
    }),
    prisma.$queryRaw<DailyAggRow[]>`
      SELECT
        to_char("timestamp" AT TIME ZONE ${APP_TIMEZONE}, 'YYYY-MM-DD') AS day,
        COUNT(*)::bigint AS clicks,
        COUNT(*) FILTER (WHERE "isUnique" = true)::bigint AS valid_clicks
      FROM "TrafficClick"
      WHERE "trafficLinkId" = ${link.id}
        AND "timestamp" >= ${since14.gte}
      GROUP BY 1
      ORDER BY 1 DESC
    `,
    prisma.$queryRaw<DailyEarnAggRow[]>`
      SELECT
        to_char("createdAt" AT TIME ZONE ${APP_TIMEZONE}, 'YYYY-MM-DD') AS day,
        COUNT(*)::bigint AS conversions,
        COALESCE(SUM("amount"), 0)::text AS earnings
      FROM "TrafficEarning"
      WHERE "trafficLinkId" = ${link.id}
        AND "isValid" = true
      GROUP BY 1
      ORDER BY 1 DESC
    `,
    prisma.$queryRaw<CountryAggRow[]>`
      SELECT
        COALESCE(NULLIF(TRIM("country"), ''), 'Unknown') AS country,
        COUNT(*)::bigint AS clicks
      FROM "TrafficClick"
      WHERE "trafficLinkId" = ${link.id}
      GROUP BY 1
      ORDER BY clicks DESC
      LIMIT 25
    `,
  ])

  const clickByDay = new Map(
    dailyClickRows.map((r) => [
      r.day,
      { clicks: Number(r.clicks), validClicks: Number(r.valid_clicks ?? r.clicks) },
    ])
  )
  const earnByDay = new Map(
    dailyEarnRows.map((r) => [
      r.day,
      { conversions: Number(r.conversions), earnings: Number(r.earnings ?? 0) },
    ])
  )

  const allDates = new Set<string>()
  for (let i = 13; i >= 0; i--) allDates.add(addDays(today, -i))
  for (const d of clickByDay.keys()) allDates.add(d)
  for (const d of earnByDay.keys()) allDates.add(d)

  let totalEarn = 0
  let totalConv = 0
  for (const e of earnByDay.values()) {
    totalEarn += e.earnings
    totalConv += e.conversions
  }

  const dailySeries = Array.from(allDates)
    .sort()
    .reverse()
    .map((date) => {
      const c = clickByDay.get(date)
      const e = earnByDay.get(date)
      return {
        date,
        clicks: c?.clicks ?? 0,
        uniqueClicks: c?.validClicks ?? 0,
        earnings: parseFloat((e?.earnings ?? 0).toFixed(4)),
        ...(opts.includeAdminConversionCounts ? { conversions: e?.conversions ?? 0 } : {}),
      }
    })

  const totalCountryClicks = countryRows.reduce((s, r) => s + Number(r.clicks), 0)
  const countryStats = countryRows.map((r) => {
    const clicks = Number(r.clicks)
    return {
      country: r.country || 'Unknown',
      clicks,
      percentage: totalCountryClicks > 0 ? parseFloat(((clicks / totalCountryClicks) * 100).toFixed(1)) : 0,
    }
  })

  return {
    portal: 'traffic' as const,
    timezone: APP_TIMEZONE,
    link: {
      id: link.id,
      name: link.name,
      uniqueCode: link.uniqueCode,
      trackingUrl: `${opts.appUrl}/send/${link.uniqueCode}`,
      targetUrl: link.targetUrl,
      linkType: 'traffic',
      isActive: link.isActive,
      isDeleted: link.isDeleted,
      createdAt: link.createdAt,
      ...(opts.includeAdminConversionCounts
        ? { owner: { id: link.user.id, name: link.user.name, email: link.user.email } }
        : {}),
    },
    metrics: {
      totalClicks: link.totalClicks,
      uniqueClicks: link.uniqueClicks,
      todayClicks,
      yesterdayClicks,
      totalEarnings: parseFloat(totalEarn.toFixed(4)),
      ...(opts.includeAdminConversionCounts ? { totalConversions: totalConv } : {}),
    },
    countryStats,
    dailySeries,
  }
}

