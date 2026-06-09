import { prisma } from '@/lib/prisma'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { updateWithdrawalSchema } from '@/lib/validators'
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

    const { status, note } = result.data

    // 1. Try to find in PubWithdrawal table first
    const pubWithdrawal = await prisma.pubWithdrawal.findUnique({ where: { id } })

    if (pubWithdrawal) {
      if (pubWithdrawal.status !== 'PENDING' && pubWithdrawal.status !== 'PROCESSING') {
        return NextResponse.json(
          { success: false, error: 'Withdrawal is already processed' },
          { status: 400 }
        )
      }

      if (status === 'REJECTED') {
        // Refund amount to publisher wallet balance
        await prisma.$transaction([
          prisma.pubWithdrawal.update({
            where: { id },
            data: { status, processedAt: new Date(), note },
          }),
          prisma.publisher.update({
            where: { id: pubWithdrawal.publisherId },
            data: { walletBalance: { increment: pubWithdrawal.amount } },
          }),
        ])
      } else {
        await prisma.pubWithdrawal.update({
          where: { id },
          data: { status, processedAt: new Date(), note },
        })
      }

      const updated = await prisma.pubWithdrawal.findUnique({ where: { id } })
      return NextResponse.json({ success: true, data: updated })
    }

    // 2. Try to find in TrafficWithdrawal table
    const trafficWithdrawal = await prisma.trafficWithdrawal.findUnique({ where: { id } })

    if (trafficWithdrawal) {
      if (trafficWithdrawal.status !== 'PENDING' && trafficWithdrawal.status !== 'PROCESSING') {
        return NextResponse.json(
          { success: false, error: 'Withdrawal is already processed' },
          { status: 400 }
        )
      }

      if (status === 'REJECTED') {
        // Refund amount to traffic user wallet balance
        await prisma.$transaction([
          prisma.trafficWithdrawal.update({
            where: { id },
            data: { status, processedAt: new Date(), note },
          }),
          prisma.trafficUser.update({
            where: { id: trafficWithdrawal.userId },
            data: { walletBalance: { increment: trafficWithdrawal.amount } },
          }),
        ])
      } else {
        await prisma.trafficWithdrawal.update({
          where: { id },
          data: { status, processedAt: new Date(), note },
        })
      }

      const updated = await prisma.trafficWithdrawal.findUnique({ where: { id } })
      return NextResponse.json({ success: true, data: updated })
    }

    return NextResponse.json({ success: false, error: 'Withdrawal request not found' }, { status: 404 })
  } catch (error) {
    console.error('[admin/withdrawals PATCH]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
