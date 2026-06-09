import { prisma } from '@/lib/prisma'
import { postbackBodySchema } from '@/lib/validators'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = postbackBodySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 200 } // Return 200 as specified, but with success: false
      )
    }

    const { code, uid, type, secret } = result.data

    // 1. Fetch postback_secret from database config
    const secretConfig = await prisma.globalConfig.findUnique({
      where: { key: 'postback_secret' },
    })
    const validSecret = secretConfig?.value ?? 'pw_secret_changeme'

    if (secret !== validSecret) {
      return NextResponse.json({ success: false, error: 'Invalid secret' }, { status: 200 })
    }

    if (type === 'publisher') {
      // 2. Find TrackingLink by uniqueCode
      const trackingLink = await prisma.trackingLink.findUnique({
        where: { uniqueCode: code },
        include: { publisher: true },
      })

      if (!trackingLink) {
        return NextResponse.json({ success: false, reason: 'link not found' }, { status: 200 })
      }

      // 3. Check duplicate conversion
      const existingConversion = await prisma.conversion.findUnique({
        where: {
          publisherId_externalUserId: {
            publisherId: trackingLink.publisherId,
            externalUserId: uid,
          },
        },
      })

      if (existingConversion) {
        return NextResponse.json({ success: false, reason: 'duplicate' }, { status: 200 })
      }

      // 4. Fetch reward amount
      const earnConfig = await prisma.globalConfig.findUnique({
        where: { key: 'pub_earn_amount' },
      })
      const earnAmount = parseFloat(earnConfig?.value ?? '0.05')

      // 5. Atomic transaction
      await prisma.$transaction([
        prisma.conversion.create({
          data: {
            publisherId: trackingLink.publisherId,
            trackingLinkId: trackingLink.id,
            externalUserId: uid,
            amount: earnAmount,
            status: 'CONFIRMED',
          },
        }),
        prisma.publisher.update({
          where: { id: trackingLink.publisherId },
          data: { walletBalance: { increment: earnAmount } },
        }),
      ])

      return NextResponse.json({ success: true, credited: earnAmount }, { status: 200 })
    } else if (type === 'traffic') {
      // 2. Find TrafficLink by uniqueCode
      const trafficLink = await prisma.trafficLink.findUnique({
        where: { uniqueCode: code },
        include: { user: true },
      })

      if (!trafficLink) {
        return NextResponse.json({ success: false, reason: 'link not found' }, { status: 200 })
      }

      if (!trafficLink.isActive) {
        return NextResponse.json({ success: false, reason: 'link is inactive' }, { status: 200 })
      }

      // 3. Check duplicate traffic earning
      const existingEarning = await prisma.trafficEarning.findUnique({
        where: {
          trafficLinkId_externalUserId: {
            trafficLinkId: trafficLink.id,
            externalUserId: uid,
          },
        },
      })

      if (existingEarning) {
        return NextResponse.json({ success: false, reason: 'duplicate' }, { status: 200 })
      }

      // 4. Fetch reward amount
      const earnConfig = await prisma.globalConfig.findUnique({
        where: { key: 'traffic_earn_amount' },
      })
      const earnAmount = parseFloat(earnConfig?.value ?? '3.00')

      // 5. Atomic transaction
      await prisma.$transaction([
        prisma.trafficEarning.create({
          data: {
            userId: trafficLink.userId,
            trafficLinkId: trafficLink.id,
            externalUserId: uid,
            amount: earnAmount,
          },
        }),
        prisma.trafficUser.update({
          where: { id: trafficLink.userId },
          data: { walletBalance: { increment: earnAmount } },
        }),
        prisma.trafficLink.update({
          where: { id: trafficLink.id },
          data: { conversions: { increment: 1 } },
        }),
      ])

      return NextResponse.json({ success: true, credited: earnAmount }, { status: 200 })
    }

    return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 200 })
  } catch (error) {
    console.error('[postback API catch-all error]', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 200 }
    )
  }
}
