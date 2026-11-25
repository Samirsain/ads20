import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { todayIST } from '@/lib/appTime'
import {
  MIN_WITHDRAWAL_USD,
  microsToDecimal,
  microsToNumber,
  toMicros,
} from '@/lib/money'
import { getConfiguredMinWithdrawal, type AccountType } from '@/lib/settlement'

export type WithdrawalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'PROCESSING'
  | 'PAID'
  | 'REJECTED'
  | 'UNCERTAIN'

const ACTIVE_RESERVATION_STATUSES: WithdrawalStatus[] = [
  'PENDING',
  'APPROVED',
  'PROCESSING',
  'UNCERTAIN',
]

const VALID_TRANSITIONS: Record<WithdrawalStatus, WithdrawalStatus[]> = {
  PENDING: ['APPROVED', 'PROCESSING', 'PAID', 'REJECTED'],
  APPROVED: ['PROCESSING', 'PAID', 'REJECTED', 'UNCERTAIN'],
  PROCESSING: ['PAID', 'UNCERTAIN', 'REJECTED'],
  UNCERTAIN: ['PAID', 'REJECTED'],
  PAID: [],
  REJECTED: [],
}

export class WithdrawalError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

/**
 * Atomically reserves available settled balance and creates a withdrawal request.
 * Prevents concurrent overspending using conditional `walletBalance >= amount`.
 */
export async function createWithdrawalRequest(input: {
  accountType: AccountType
  accountId: string
  amount: number
  walletAddress: string
  network: 'TRC20' | 'ERC20' | 'BEP20'
  idempotencyKey?: string
}) {
  const minWithdrawal = await getConfiguredMinWithdrawal()
  const effectiveMin = Math.max(MIN_WITHDRAWAL_USD, minWithdrawal)

  const amountMicros = toMicros(input.amount.toFixed(2))
  const minMicros = toMicros(effectiveMin.toFixed(2))
  if (amountMicros < minMicros) {
    throw new WithdrawalError(
      `Minimum withdrawal amount is $${effectiveMin.toFixed(2)}. Below-threshold balances roll over automatically.`,
      400
    )
  }

  const amountDec = microsToDecimal(amountMicros)

  if (input.idempotencyKey) {
    const existing =
      input.accountType === 'PUBLISHER'
        ? await prisma.pubWithdrawal.findUnique({ where: { idempotencyKey: input.idempotencyKey } })
        : await prisma.trafficWithdrawal.findUnique({ where: { idempotencyKey: input.idempotencyKey } })
    if (existing) {
      return { withdrawalId: existing.id, deduplicated: true, withdrawal: existing }
    }
  }

  const batchDate = todayIST()

  return prisma.$transaction(async (tx) => {
    if (input.accountType === 'PUBLISHER') {
      const account = await tx.publisher.findUnique({
        where: { id: input.accountId },
        select: { id: true, isActive: true, walletBalance: true },
      })
      if (!account) throw new WithdrawalError('Account not found', 401)
      if (!account.isActive) throw new WithdrawalError('Account is deactivated', 403)

      const updatedCount = await tx.publisher.updateMany({
        where: {
          id: input.accountId,
          walletBalance: { gte: amountDec },
        },
        data: {
          walletBalance: { decrement: amountDec },
          reservedBalance: { increment: amountDec },
        },
      })

      if (updatedCount.count === 0) {
        const available = microsToNumber(toMicros(account.walletBalance), 2)
        throw new WithdrawalError(
          `Insufficient available settled balance. Available: $${available.toFixed(2)} (today's earnings settle next day).`,
          400
        )
      }

      const fresh = await tx.publisher.findUniqueOrThrow({
        where: { id: input.accountId },
        select: { walletBalance: true, reservedBalance: true },
      })

      const w = await tx.pubWithdrawal.create({
        data: {
          publisherId: input.accountId,
          amount: amountDec,
          walletAddress: input.walletAddress,
          network: input.network,
          status: 'PENDING',
          payoutBatchDate: batchDate,
          idempotencyKey: input.idempotencyKey ?? null,
        },
      })

      await tx.withdrawalStatusHistory.create({
        data: {
          withdrawalType: 'PUBLISHER',
          withdrawalId: w.id,
          fromStatus: null,
          toStatus: 'PENDING',
          actorType: 'PUBLISHER',
          actorId: input.accountId,
          note: `Reserved $${microsToNumber(amountMicros, 2).toFixed(2)} for daily payout batch (${batchDate} IST)`,
        },
      })

      await tx.ledgerTransaction.create({
        data: {
          accountType: 'PUBLISHER',
          accountId: input.accountId,
          entryType: 'WITHDRAWAL_RESERVE',
          direction: 'RESERVE',
          amount: amountDec,
          balanceAfter: fresh.walletBalance,
          reservedAfter: fresh.reservedBalance,
          referenceType: 'PUB_WITHDRAWAL',
          referenceId: w.id,
          idempotencyKey: `reserve:PUBLISHER:${w.id}`,
          note: `Withdrawal request reserved (${input.network})`,
        },
      })

      return { withdrawalId: w.id, deduplicated: false, withdrawal: w }
    }

    // TRAFFIC
    const account = await tx.trafficUser.findUnique({
      where: { id: input.accountId },
      select: { id: true, isActive: true, walletBalance: true },
    })
    if (!account) throw new WithdrawalError('Account not found', 401)
    if (!account.isActive) throw new WithdrawalError('Account is deactivated', 403)

    const updatedCount = await tx.trafficUser.updateMany({
      where: {
        id: input.accountId,
        walletBalance: { gte: amountDec },
      },
      data: {
        walletBalance: { decrement: amountDec },
        reservedBalance: { increment: amountDec },
      },
    })

    if (updatedCount.count === 0) {
      const available = microsToNumber(toMicros(account.walletBalance), 2)
      throw new WithdrawalError(
        `Insufficient available settled balance. Available: $${available.toFixed(2)} (today's earnings settle next day).`,
        400
      )
    }

    const fresh = await tx.trafficUser.findUniqueOrThrow({
      where: { id: input.accountId },
      select: { walletBalance: true, reservedBalance: true },
    })

    const w = await tx.trafficWithdrawal.create({
      data: {
        userId: input.accountId,
        amount: amountDec,
        walletAddress: input.walletAddress,
        network: input.network,
        status: 'PENDING',
        payoutBatchDate: batchDate,
        idempotencyKey: input.idempotencyKey ?? null,
      },
    })

    await tx.withdrawalStatusHistory.create({
      data: {
        withdrawalType: 'TRAFFIC',
        withdrawalId: w.id,
        fromStatus: null,
        toStatus: 'PENDING',
        actorType: 'TRAFFIC',
        actorId: input.accountId,
        note: `Reserved $${microsToNumber(amountMicros, 2).toFixed(2)} for daily payout batch (${batchDate} IST)`,
      },
    })

    await tx.ledgerTransaction.create({
      data: {
        accountType: 'TRAFFIC',
        accountId: input.accountId,
        entryType: 'WITHDRAWAL_RESERVE',
        direction: 'RESERVE',
        amount: amountDec,
        balanceAfter: fresh.walletBalance,
        reservedAfter: fresh.reservedBalance,
        referenceType: 'TRAFFIC_WITHDRAWAL',
        referenceId: w.id,
        idempotencyKey: `reserve:TRAFFIC:${w.id}`,
        note: `Withdrawal request reserved (${input.network})`,
      },
    })

    return { withdrawalId: w.id, deduplicated: false, withdrawal: w }
  })
}

/**
 * Admin lifecycle transition for both PubWithdrawal and TrafficWithdrawal.
 * Guarantees atomic state transition, single paid debit / single reject refund,
 * explicit txReference on PAID, and immutable history + ledger + audit entries.
 */
export async function transitionWithdrawalStatus(input: {
  id: string
  targetStatus: Exclude<WithdrawalStatus, 'PENDING'>
  adminId: string
  adminEmail?: string
  note?: string
  txReference?: string
  failureReason?: string
  idempotencyKey?: string
}) {
  if (input.targetStatus === 'PAID' && !input.txReference?.trim()) {
    throw new WithdrawalError('Transaction ID / payment reference (txReference) is required to mark Paid.', 400)
  }
  if (input.targetStatus === 'REJECTED' && !input.note?.trim()) {
    throw new WithdrawalError('Rejection reason note is required.', 400)
  }

  return prisma.$transaction(async (tx) => {
    const pub = await tx.pubWithdrawal.findUnique({ where: { id: input.id } })
    const traffic = pub ? null : await tx.trafficWithdrawal.findUnique({ where: { id: input.id } })

    if (!pub && !traffic) {
      throw new WithdrawalError('Withdrawal request not found', 404)
    }

    const accountType: AccountType = pub ? 'PUBLISHER' : 'TRAFFIC'
    const record = (pub ?? traffic)!
    const accountId = pub ? pub.publisherId : traffic!.userId
    const currentStatus = record.status as WithdrawalStatus

    // Safe idempotent retry if caller passed the same idempotency key and it already reached targetStatus
    if (input.idempotencyKey) {
      const ledgerKey = `${input.targetStatus.toLowerCase()}:${accountType}:${record.id}`
      if (currentStatus === input.targetStatus) {
        const already = await tx.ledgerTransaction.findUnique({
          where: { idempotencyKey: ledgerKey },
          select: { id: true },
        })
        if (already) return { accountType, withdrawal: record, idempotentHit: true }
      }
    }

    const allowed = VALID_TRANSITIONS[currentStatus] ?? []
    if (!allowed.includes(input.targetStatus)) {
      throw new WithdrawalError(
        `Invalid transition from ${currentStatus} to ${input.targetStatus}.`,
        409
      )
    }

    const now = new Date()
    const amountDec = new Prisma.Decimal(record.amount)
    const txRef = input.txReference?.trim() || null
    const noteText = input.note?.trim() || record.note || null

    const updateData: Prisma.PubWithdrawalUpdateManyMutationInput = {
      status: input.targetStatus,
      note: noteText,
      ...(input.targetStatus === 'APPROVED' && {
        approvedAt: now,
        approvedByAdminId: input.adminId,
      }),
      ...(input.targetStatus === 'PAID' && {
        txReference: txRef,
        processedAt: now,
        processedByAdminId: input.adminId,
      }),
      ...(input.targetStatus === 'REJECTED' && {
        processedAt: now,
        processedByAdminId: input.adminId,
      }),
      ...(input.targetStatus === 'UNCERTAIN' && {
        failureReason: input.failureReason?.trim() || noteText || 'Uncertain payout outcome — requires reconciliation',
        processedByAdminId: input.adminId,
      }),
    }

    // Atomic conditional status guard prevents duplicate concurrent clicks from paying or refunding twice!
    const guarded =
      accountType === 'PUBLISHER'
        ? await tx.pubWithdrawal.updateMany({
            where: { id: record.id, status: currentStatus },
            data: updateData,
          })
        : await tx.trafficWithdrawal.updateMany({
            where: { id: record.id, status: currentStatus },
            data: updateData,
          })

    if (guarded.count === 0) {
      throw new WithdrawalError('Concurrent update detected — withdrawal status already changed.', 409)
    }

    if (input.targetStatus === 'PAID') {
      // Funds were already reserved from walletBalance on request creation; finalize by clearing reservedBalance once.
      const ledgerKey = `paid:${accountType}:${record.id}`
      const existingLedger = await tx.ledgerTransaction.findUnique({ where: { idempotencyKey: ledgerKey } })
      if (existingLedger) {
        throw new WithdrawalError('Withdrawal already settled in ledger', 409)
      }

      let balanceAfter: Prisma.Decimal
      let reservedAfter: Prisma.Decimal

      if (accountType === 'PUBLISHER') {
        const res = await tx.publisher.updateMany({
          where: { id: accountId, reservedBalance: { gte: amountDec } },
          data: { reservedBalance: { decrement: amountDec } },
        })
        if (res.count === 0) {
          throw new WithdrawalError('Reserved balance mismatch while finalizing payout', 409)
        }
        const acct = await tx.publisher.findUniqueOrThrow({
          where: { id: accountId },
          select: { walletBalance: true, reservedBalance: true },
        })
        balanceAfter = acct.walletBalance
        reservedAfter = acct.reservedBalance
      } else {
        const res = await tx.trafficUser.updateMany({
          where: { id: accountId, reservedBalance: { gte: amountDec } },
          data: { reservedBalance: { decrement: amountDec } },
        })
        if (res.count === 0) {
          throw new WithdrawalError('Reserved balance mismatch while finalizing payout', 409)
        }
        const acct = await tx.trafficUser.findUniqueOrThrow({
          where: { id: accountId },
          select: { walletBalance: true, reservedBalance: true },
        })
        balanceAfter = acct.walletBalance
        reservedAfter = acct.reservedBalance
      }

      await tx.ledgerTransaction.create({
        data: {
          accountType,
          accountId,
          entryType: 'WITHDRAWAL_PAID',
          direction: 'DEBIT',
          amount: amountDec,
          balanceAfter,
          reservedAfter,
          referenceType: accountType === 'PUBLISHER' ? 'PUB_WITHDRAWAL' : 'TRAFFIC_WITHDRAWAL',
          referenceId: record.id,
          idempotencyKey: ledgerKey,
          actorAdminId: input.adminId,
          note: `Payout confirmed (ref: ${txRef})`,
        },
      })
    } else if (input.targetStatus === 'REJECTED') {
      // Release reservation back into available walletBalance exactly once.
      const ledgerKey = `release:${accountType}:${record.id}`
      const existingLedger = await tx.ledgerTransaction.findUnique({ where: { idempotencyKey: ledgerKey } })
      if (existingLedger) {
        throw new WithdrawalError('Withdrawal reservation already released', 409)
      }

      let balanceAfter: Prisma.Decimal
      let reservedAfter: Prisma.Decimal

      if (accountType === 'PUBLISHER') {
        const res = await tx.publisher.updateMany({
          where: { id: accountId, reservedBalance: { gte: amountDec } },
          data: {
            reservedBalance: { decrement: amountDec },
            walletBalance: { increment: amountDec },
          },
        })
        if (res.count === 0) {
          throw new WithdrawalError('Reserved balance mismatch while releasing rejected withdrawal', 409)
        }
        const acct = await tx.publisher.findUniqueOrThrow({
          where: { id: accountId },
          select: { walletBalance: true, reservedBalance: true },
        })
        balanceAfter = acct.walletBalance
        reservedAfter = acct.reservedBalance
      } else {
        const res = await tx.trafficUser.updateMany({
          where: { id: accountId, reservedBalance: { gte: amountDec } },
          data: {
            reservedBalance: { decrement: amountDec },
            walletBalance: { increment: amountDec },
          },
        })
        if (res.count === 0) {
          throw new WithdrawalError('Reserved balance mismatch while releasing rejected withdrawal', 409)
        }
        const acct = await tx.trafficUser.findUniqueOrThrow({
          where: { id: accountId },
          select: { walletBalance: true, reservedBalance: true },
        })
        balanceAfter = acct.walletBalance
        reservedAfter = acct.reservedBalance
      }

      await tx.ledgerTransaction.create({
        data: {
          accountType,
          accountId,
          entryType: 'WITHDRAWAL_RELEASE',
          direction: 'RELEASE',
          amount: amountDec,
          balanceAfter,
          reservedAfter,
          referenceType: accountType === 'PUBLISHER' ? 'PUB_WITHDRAWAL' : 'TRAFFIC_WITHDRAWAL',
          referenceId: record.id,
          idempotencyKey: ledgerKey,
          actorAdminId: input.adminId,
          note: `Rejected & released reservation (${noteText})`,
        },
      })
    }

    await tx.withdrawalStatusHistory.create({
      data: {
        withdrawalType: accountType,
        withdrawalId: record.id,
        fromStatus: currentStatus,
        toStatus: input.targetStatus,
        actorType: 'ADMIN',
        actorId: input.adminId,
        txReference: txRef,
        note: noteText ?? input.failureReason ?? null,
      },
    })

    await tx.adminAuditLog.create({
      data: {
        actorAdminId: input.adminId,
        actorEmail: input.adminEmail ?? null,
        action: `WITHDRAWAL_${input.targetStatus}`,
        targetType: accountType === 'PUBLISHER' ? 'PUB_WITHDRAWAL' : 'TRAFFIC_WITHDRAWAL',
        targetId: record.id,
        affectedCount: 1,
        reason: noteText ?? input.failureReason ?? null,
        outcome: 'SUCCESS',
        metadata: {
          fromStatus: currentStatus,
          toStatus: input.targetStatus,
          txReference: txRef,
          amount: microsToNumber(toMicros(record.amount), 2),
        },
      },
    })

    const updated =
      accountType === 'PUBLISHER'
        ? await tx.pubWithdrawal.findUnique({ where: { id: record.id } })
        : await tx.trafficWithdrawal.findUnique({ where: { id: record.id } })

    return { accountType, withdrawal: updated, idempotentHit: false }
  })
}

export { ACTIVE_RESERVATION_STATUSES }

