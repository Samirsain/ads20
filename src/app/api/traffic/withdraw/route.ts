import { prisma } from '@/lib/prisma'
import { getTrafficUserFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { withdrawalSchema } from '@/lib/validators'
import { getAccountFinancialSummary } from '@/lib/settlement'
import { createWithdrawalRequest, WithdrawalError } from '@/lib/withdrawals'
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

    const { amount, walletAddress, network, idempotencyKey } = result.data

    const created = await createWithdrawalRequest({
      accountType: 'TRAFFIC',
      accountId: user.userId,
      amount,
      walletAddress,
      network,
      idempotencyKey,
    })

    return NextResponse.json(
      {
        success: true,
        withdrawalId: created.withdrawalId,
        deduplicated: created.deduplicated,
      },
      { status: created.deduplicated ? 200 : 201 }
    )
  } catch (error) {
    if (error instanceof WithdrawalError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    }
    console.error('[traffic/withdraw POST]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/traffic/withdraw — list traffic user's withdrawals and summary
export async function GET(request: NextRequest) {
  try {
    const user = getTrafficUserFromRequest(request)
    if (!user) return unauthorizedResponse()

    const [withdrawals, summary] = await Promise.all([
      prisma.trafficWithdrawal.findMany({
        where: { userId: user.userId },
        orderBy: { requestedAt: 'desc' },
      }),
      getAccountFinancialSummary('TRAFFIC', user.userId),
    ])

    return NextResponse.json({ success: true, data: withdrawals, summary })
  } catch (error) {
    console.error('[traffic/withdraw GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
