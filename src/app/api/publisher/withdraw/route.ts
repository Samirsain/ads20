import { prisma } from '@/lib/prisma'
import { getPublisherFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { withdrawalSchema } from '@/lib/validators'
import { getAccountFinancialSummary } from '@/lib/settlement'
import { createWithdrawalRequest, WithdrawalError } from '@/lib/withdrawals'
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

    const { amount, walletAddress, network, idempotencyKey } = result.data

    const created = await createWithdrawalRequest({
      accountType: 'PUBLISHER',
      accountId: publisher.publisherId,
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
    console.error('[publisher/withdraw POST]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/publisher/withdraw — list publisher's withdrawals and balance summary
export async function GET(request: NextRequest) {
  try {
    const publisher = getPublisherFromRequest(request)
    if (!publisher) return unauthorizedResponse()

    const [withdrawals, summary] = await Promise.all([
      prisma.pubWithdrawal.findMany({
        where: { publisherId: publisher.publisherId },
        orderBy: { requestedAt: 'desc' },
        select: {
          id: true,
          amount: true,
          walletAddress: true,
          network: true,
          status: true,
          note: true,
          txReference: true,
          payoutBatchDate: true,
          requestedAt: true,
          approvedAt: true,
          processedAt: true,
        },
      }),
      getAccountFinancialSummary('PUBLISHER', publisher.publisherId),
    ])

    return NextResponse.json({
      success: true,
      data: withdrawals,
      summary,
    })
  } catch (error) {
    console.error('[publisher/withdraw GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
