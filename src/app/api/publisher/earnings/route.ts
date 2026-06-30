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

    const [clicks, conversions] = await Promise.all([
      prisma.click.findMany({
        where: { publisherId },
        select: { timestamp: true },
      }),
      prisma.conversion.findMany({
        where: { publisherId },
        select: { createdAt: true },
      }),
    ])

    const impByDate = new Map<string, number>()
    for (const c of clicks) {
      const date = c.timestamp.toISOString().slice(0, 10)
      impByDate.set(date, (impByDate.get(date) ?? 0) + 1)
    }

    const convByDate = new Map<string, number>()
    for (const c of conversions) {
      const date = c.createdAt.toISOString().slice(0, 10)
      convByDate.set(date, (convByDate.get(date) ?? 0) + 1)
    }

    const allDates = new Set([...impByDate.keys(), ...convByDate.keys()])
    const dailyData = Array.from(allDates)
      .sort()
      .reverse()
      .map(date => {
        const imp = impByDate.get(date) ?? 0
        const conv = convByDate.get(date) ?? 0
        const cpmRate = computeCpmRate(imp, conv)
        const earnings = parseFloat(((imp / 1000) * cpmRate).toFixed(4))
        return { date, impressions: imp, conversions: conv, cpmRate, earnings }
      })

    const today = new Date().toISOString().slice(0, 10)
    const todayRow = dailyData.find(d => d.date === today)

    return NextResponse.json({
      success: true,
      data: {
        dailyData,
        currentCpm: todayRow?.cpmRate ?? 0.5,
        todayEarnings: todayRow?.earnings ?? 0,
        totalImpressions: Array.from(impByDate.values()).reduce((a, b) => a + b, 0),
        totalEarnings: parseFloat(dailyData.reduce((sum, d) => sum + d.earnings, 0).toFixed(4)),
      },
    })
  } catch (error) {
    console.error('[publisher/earnings GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
