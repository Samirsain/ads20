import { prisma } from '@/lib/prisma'
import { getPublisherFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
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
    const publisher = getPublisherFromRequest(request)
    if (!publisher) return unauthorizedResponse()

    const publisherId = publisher.publisherId

    const publisherData = await prisma.publisher.findUnique({
      where: { id: publisherId },
      select: { walletBalance: true },
    })

    if (!publisherData) return unauthorizedResponse()

    // Total impressions (clicks) across all links
    const aggregateClicks = await prisma.trackingLink.aggregate({
      where: { publisherId },
      _sum: { clicks: true },
    })
    const totalImpressions = aggregateClicks._sum.clicks ?? 0

    // Today's date range (UTC)
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setUTCHours(23, 59, 59, 999)

    // Conversion counts feed the CPM/earnings maths below but are never
    // returned: conversion data is admin-only.
    const [todayClicks, todayEarningsAgg, topLinks] = await Promise.all([
      prisma.click.count({
        where: { publisherId, timestamp: { gte: todayStart, lte: todayEnd } },
      }),
      // Actual earnings today = sum of conversion amounts today
      prisma.conversion.aggregate({
        where: { publisherId, createdAt: { gte: todayStart, lte: todayEnd } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.trackingLink.findMany({
        where: { publisherId },
        orderBy: { clicks: 'desc' },
        take: 1,
        select: { id: true, uniqueCode: true, targetUrl: true, linkType: true, clicks: true, createdAt: true },
      }),
    ])

    const todayConversions = todayEarningsAgg._count.id
    const currentCpm = computeCpmRate(todayClicks, todayConversions)
    const todayEarnings = parseFloat(Number(todayEarningsAgg._sum.amount ?? 0).toFixed(2))
    const topLink = topLinks[0] ?? null

    return NextResponse.json({
      success: true,
      data: {
        walletBalance: publisherData.walletBalance,
        totalImpressions,
        currentCpm,
        todayEarnings,
        topLink,
      },
    })
  } catch (error) {
    console.error('[publisher/dashboard]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
