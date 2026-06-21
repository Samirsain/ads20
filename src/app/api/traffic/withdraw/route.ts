import { prisma } from '@/lib/prisma'
import { getTrafficUserFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { withdrawalSchema } from '@/lib/validators'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = getTrafficUserFromRequest(request)
    if (!user) return unauthorizedResponse()

    const body = await request.json()
    const result = withdrawalSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { amount, walletAddress, network } = result.data

    // 1. Fetch min withdrawal from GlobalConfig
    const minWithdrawConfig = await prisma.globalConfig.findUnique({
      where: { key: 'min_withdrawal' },
    })
    const minWithdrawal = parseFloat(minWithdrawConfig?.value ?? '50')

    if (amount < minWithdrawal) {
      return NextResponse.json(
        { success: false, error: `Minimum withdrawal amount is $${minWithdrawal}` },
        { status: 400 }
      )
    }

    // 2. Check traffic user balance
    const userData = await prisma.trafficUser.findUnique({
      where: { id: user.userId },
      select: { walletBalance: true },
    })

    if (!userData) return unauthorizedResponse()

    const balance = Number(userData.walletBalance)
    if (balance < amount) {
      return NextResponse.json(
        { success: false, error: `Insufficient balance. Available: $${balance.toFixed(2)}` },
        { status: 400 }
      )
    }

    // 3. Check for pending withdrawals
    const pendingWithdrawal = await prisma.trafficWithdrawal.findFirst({
      where: {
        userId: user.userId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    })

    if (pendingWithdrawal) {
      return NextResponse.json(
        { success: false, error: 'You already have a pending withdrawal request' },
        { status: 409 }
      )
    }

    // 4. Create TrafficWithdrawal & deduct balance atomically
    const withdrawal = await prisma.$transaction(async (tx) => {
      const w = await tx.trafficWithdrawal.create({
        data: {
          userId: user.userId,
          amount,
          walletAddress,
          network,
          status: 'PENDING',
        },
      })
      await tx.trafficUser.update({
        where: { id: user.userId },
        data: { walletBalance: { decrement: amount } },
      })
      return w
    })

    return NextResponse.json({ success: true, withdrawalId: withdrawal.id }, { status: 201 })
  } catch (error) {
    console.error('[traffic/withdraw POST]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/traffic/withdraw — list traffic user's withdrawals
export async function GET(request: NextRequest) {
  try {
    const user = getTrafficUserFromRequest(request)
    if (!user) return unauthorizedResponse()

    const withdrawals = await prisma.trafficWithdrawal.findMany({
      where: { userId: user.userId },
      orderBy: { requestedAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: withdrawals })
  } catch (error) {
    console.error('[traffic/withdraw GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
