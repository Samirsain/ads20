import { prisma } from '@/lib/prisma'
import { getPublisherFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { withdrawalSchema } from '@/lib/validators'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const publisher = getPublisherFromRequest(request)
    if (!publisher) return unauthorizedResponse()

    const body = await request.json()
    const result = withdrawalSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { amount, upiId } = result.data

    // 1. Fetch min withdrawal from GlobalConfig
    const minWithdrawConfig = await prisma.globalConfig.findUnique({
      where: { key: 'min_withdrawal' },
    })
    const minWithdrawal = parseFloat(minWithdrawConfig?.value ?? '50')

    if (amount < minWithdrawal) {
      return NextResponse.json(
        { success: false, error: `Minimum withdrawal amount is ₹${minWithdrawal}` },
        { status: 400 }
      )
    }

    // 2. Check publisher balance
    const publisherData = await prisma.publisher.findUnique({
      where: { id: publisher.publisherId },
      select: { walletBalance: true },
    })

    if (!publisherData) return unauthorizedResponse()

    const balance = Number(publisherData.walletBalance)
    if (balance < amount) {
      return NextResponse.json(
        { success: false, error: `Insufficient balance. Available: ₹${balance.toFixed(2)}` },
        { status: 400 }
      )
    }

    // 3. Check for any pending/processing withdrawals
    const pendingWithdrawal = await prisma.pubWithdrawal.findFirst({
      where: {
        publisherId: publisher.publisherId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    })

    if (pendingWithdrawal) {
      return NextResponse.json(
        { success: false, error: 'You already have a pending withdrawal request' },
        { status: 409 }
      )
    }

    // 4. Create PubWithdrawal & deduct balance atomically
    const pubWithdrawal = await prisma.$transaction(async (tx) => {
      const w = await tx.pubWithdrawal.create({
        data: {
          publisherId: publisher.publisherId,
          amount,
          upiId,
          status: 'PENDING',
        },
      })
      await tx.publisher.update({
        where: { id: publisher.publisherId },
        data: { walletBalance: { decrement: amount } },
      })
      return w
    })

    return NextResponse.json({ success: true, withdrawalId: pubWithdrawal.id }, { status: 201 })
  } catch (error) {
    console.error('[publisher/withdraw POST]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/publisher/withdraw — list publisher's withdrawals
export async function GET(request: NextRequest) {
  try {
    const publisher = getPublisherFromRequest(request)
    if (!publisher) return unauthorizedResponse()

    const withdrawals = await prisma.pubWithdrawal.findMany({
      where: { publisherId: publisher.publisherId },
      orderBy: { requestedAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: withdrawals })
  } catch (error) {
    console.error('[publisher/withdraw GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
