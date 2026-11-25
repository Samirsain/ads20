import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { updateWithdrawalSchema } from '@/lib/validators'
import { transitionWithdrawalStatus, WithdrawalError } from '@/lib/withdrawals'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const { id } = await params
    const body = await request.json()
    const result = updateWithdrawalSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { status, note, txReference, failureReason, idempotencyKey } = result.data

    const transitioned = await transitionWithdrawalStatus({
      id,
      targetStatus: status,
      adminId: admin.adminId,
      adminEmail: admin.email,
      note,
      txReference,
      failureReason,
      idempotencyKey,
    })

    return NextResponse.json({
      success: true,
      data: transitioned.withdrawal,
      idempotentHit: transitioned.idempotentHit,
    })
  } catch (error) {
    if (error instanceof WithdrawalError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    }
    console.error('[admin/withdrawals PATCH]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
