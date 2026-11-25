import { prisma } from '@/lib/prisma'
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/apiAuth'
import { dateIn, getPayoutWindowStatus, startOfDay, todayIST } from '@/lib/appTime'
import { MIN_WITHDRAWAL_USD, microsToNumber, toMicros } from '@/lib/money'
import { getConfiguredMinWithdrawal, runNextDaySettlement } from '@/lib/settlement'
import { transitionWithdrawalStatus } from '@/lib/withdrawals'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const today = todayIST()
    const todayStart = startOfDay(today)
    const minWithdrawal = await getConfiguredMinWithdrawal()

    const [
      recentBatches,
      unsettledPub,
      unsettledTraffic,
      approvedPubWithdrawals,
      approvedTrafficWithdrawals,
      pendingWithdrawalsCount,
      uncertainWithdrawals,
      eligiblePublishersNotRequested,
      eligibleTrafficNotRequested,
    ] = await Promise.all([
      prisma.settlementBatchRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 20,
      }),
      prisma.conversion.findMany({
        where: { isValid: true, settlementId: null, createdAt: { lt: todayStart } },
        select: { amount: true, createdAt: true },
      }),
      prisma.trafficEarning.findMany({
        where: { isValid: true, settlementId: null, createdAt: { lt: todayStart } },
        select: { amount: true, createdAt: true },
      }),
      prisma.pubWithdrawal.findMany({
        where: { status: 'APPROVED' },
        orderBy: { requestedAt: 'asc' },
        include: { publisher: { select: { id: true, name: true, email: true } } },
      }),
      prisma.trafficWithdrawal.findMany({
        where: { status: 'APPROVED' },
        orderBy: { requestedAt: 'asc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      Promise.all([
        prisma.pubWithdrawal.count({ where: { status: 'PENDING' } }),
        prisma.trafficWithdrawal.count({ where: { status: 'PENDING' } }),
      ]),
      Promise.all([
        prisma.pubWithdrawal.findMany({
          where: { status: { in: ['PROCESSING', 'UNCERTAIN'] } },
          include: { publisher: { select: { id: true, name: true, email: true } } },
        }),
        prisma.trafficWithdrawal.findMany({
          where: { status: { in: ['PROCESSING', 'UNCERTAIN'] } },
          include: { user: { select: { id: true, name: true, email: true } } },
        }),
      ]),
      prisma.publisher.findMany({
        where: {
          walletBalance: { gte: minWithdrawal },
          withdrawals: { none: { status: { in: ['PENDING', 'APPROVED', 'PROCESSING', 'UNCERTAIN'] } } },
        },
        select: { id: true, name: true, email: true, walletBalance: true },
      }),
      prisma.trafficUser.findMany({
        where: {
          walletBalance: { gte: minWithdrawal },
          withdrawals: { none: { status: { in: ['PENDING', 'APPROVED', 'PROCESSING', 'UNCERTAIN'] } } },
        },
        select: { id: true, name: true, email: true, walletBalance: true },
      }),
    ])

    const unsettledByDate = new Map<string, { count: number; micros: bigint }>()
    for (const r of [...unsettledPub, ...unsettledTraffic]) {
      const d = dateIn(r.createdAt)
      const cur = unsettledByDate.get(d) ?? { count: 0, micros: 0n }
      cur.count += 1
      cur.micros += toMicros(r.amount)
      unsettledByDate.set(d, cur)
    }

    const totalApprovedPayable =
      approvedPubWithdrawals.reduce((s, w) => s + Number(w.amount), 0) +
      approvedTrafficWithdrawals.reduce((s, w) => s + Number(w.amount), 0)

    return NextResponse.json({
      success: true,
      data: {
        timezone: 'Asia/Kolkata',
        today,
        minWithdrawal: Math.max(MIN_WITHDRAWAL_USD, minWithdrawal),
        payoutWindow: getPayoutWindowStatus(),
        unsettledDates: Array.from(unsettledByDate.entries())
          .sort((a, b) => (a[0] < b[0] ? 1 : -1))
          .map(([date, v]) => ({
            date,
            count: v.count,
            amount: microsToNumber(v.micros, 4),
          })),
        payoutBatch: {
          approvedCount: approvedPubWithdrawals.length + approvedTrafficWithdrawals.length,
          totalPayable: Number(totalApprovedPayable.toFixed(2)),
          pendingApprovalCount: pendingWithdrawalsCount[0] + pendingWithdrawalsCount[1],
          exceptionsCount: uncertainWithdrawals[0].length + uncertainWithdrawals[1].length,
          approvedPublisherWithdrawals: approvedPubWithdrawals,
          approvedTrafficWithdrawals: approvedTrafficWithdrawals,
          exceptions: {
            publisher: uncertainWithdrawals[0],
            traffic: uncertainWithdrawals[1],
          },
          eligibleWithoutRequest: [
            ...eligiblePublishersNotRequested.map((p) => ({
              accountType: 'PUBLISHER' as const,
              id: p.id,
              name: p.name,
              email: p.email,
              availableBalance: Number(p.walletBalance),
            })),
            ...eligibleTrafficNotRequested.map((t) => ({
              accountType: 'TRAFFIC' as const,
              id: t.id,
              name: t.name,
              email: t.email,
              availableBalance: Number(t.walletBalance),
            })),
          ],
        },
        recentBatches,
      },
    })
  } catch (error) {
    console.error('[admin/settlement GET]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin) return unauthorizedResponse()

    const body = await request.json()
    const action = body?.action

    if (action === 'run_settlement') {
      const targetDate = typeof body?.targetDate === 'string' && body.targetDate ? body.targetDate : null
      const result = await runNextDaySettlement({
        targetDate,
        triggeredBy: 'ADMIN',
        actorAdminId: admin.adminId,
        actorEmail: admin.email,
      })
      return NextResponse.json({ success: true, data: result })
    }

    if (action === 'run_mock_payout_batch') {
      // Local trial simulated payout batch for APPROVED requests only — never sends real money.
      const today = todayIST()
      const [approvedPub, approvedTraffic] = await Promise.all([
        prisma.pubWithdrawal.findMany({ where: { status: 'APPROVED' } }),
        prisma.trafficWithdrawal.findMany({ where: { status: 'APPROVED' } }),
      ])

      const allApproved = [...approvedPub, ...approvedTraffic]
      if (allApproved.length === 0) {
        return NextResponse.json({
          success: true,
          data: { paidCount: 0, totalPaid: 0, message: 'No APPROVED withdrawal requests in queue.' },
        })
      }

      const batch = await prisma.settlementBatchRun.create({
        data: {
          batchDate: today,
          trafficDate: today,
          kind: 'PAYOUT_BATCH',
          status: 'STARTED',
          eligibleCount: allApproved.length,
          triggeredBy: 'LOCAL_TRIAL',
          actorAdminId: admin.adminId,
        },
      })

      let paidCount = 0
      let exceptionCount = 0
      let totalPaidMicros = 0n

      for (const w of allApproved) {
        try {
          const mockRef = `MOCK-BATCH-${today.replace(/-/g, '')}-${w.id.slice(-6).toUpperCase()}`
          await transitionWithdrawalStatus({
            id: w.id,
            targetStatus: 'PAID',
            adminId: admin.adminId,
            adminEmail: admin.email,
            txReference: mockRef,
            note: `Local trial daily payout batch (${today} 12-2 PM IST)`,
            idempotencyKey: `batch:${batch.id}:${w.id}`,
          })
          paidCount++
          totalPaidMicros += toMicros(w.amount)
        } catch (err) {
          console.error('[mock payout batch item error]', w.id, err)
          exceptionCount++
        }
      }

      const finalStatus = exceptionCount > 0 ? 'COMPLETED_WITH_EXCEPTIONS' : 'COMPLETED'
      await prisma.settlementBatchRun.update({
        where: { id: batch.id },
        data: {
          status: finalStatus,
          paidCount,
          exceptionCount,
          totalAmount: microsToNumber(totalPaidMicros, 2),
          completedAt: new Date(),
          notes: 'Local trial mocked batch execution (no real external transfer performed).',
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          batchId: batch.id,
          paidCount,
          exceptionCount,
          totalPaid: microsToNumber(totalPaidMicros, 2),
          status: finalStatus,
          mode: 'LOCAL_TRIAL_MOCK',
        },
      })
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 })
  } catch (error) {
    console.error('[admin/settlement POST]', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 400 }
    )
  }
}

