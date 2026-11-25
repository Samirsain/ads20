import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import {
  addDays,
  dateIn,
  dayRange,
  getPayoutWindowStatus,
  isDateStr,
  startOfDay,
  todayIST,
  yesterdayIST,
} from '@/lib/appTime'
import {
  MIN_WITHDRAWAL_USD,
  microsToDecimal,
  microsToNumber,
  toMicros,
} from '@/lib/money'

export type AccountType = 'PUBLISHER' | 'TRAFFIC'

export async function getConfiguredMinWithdrawal(): Promise<number> {
  const row = await prisma.globalConfig.findUnique({ where: { key: 'min_withdrawal' } })
  const parsed = Number(row?.value ?? MIN_WITHDRAWAL_USD)
  if (!Number.isFinite(parsed) || parsed < MIN_WITHDRAWAL_USD) {
    return MIN_WITHDRAWAL_USD
  }
  return parsed
}

export interface FinancialSummary {
  timezone: string
  todayDate: string
  yesterdayDate: string
  todayClicks: number
  todayValidClicks: number
  todayEarnings: number
  yesterdayEarnings: number
  yesterdaySettlementStatus: 'SETTLED' | 'LEGACY_SETTLED' | 'PENDING_SETTLEMENT' | 'EXCEPTION' | 'NONE'
  availableBalance: number
  pendingPayment: number
  totalPaid: number
  minWithdrawal: number
  canWithdraw: boolean
  shortfallToMin: number
  payoutWindow: ReturnType<typeof getPayoutWindowStatus>
}

/**
 * Authoritative financial & IST-day summary for a publisher or traffic user.
 * Never returns conversion counts or external registration IDs.
 */
export async function getAccountFinancialSummary(
  accountType: AccountType,
  accountId: string
): Promise<FinancialSummary | null> {
  const today = todayIST()
  const yesterday = yesterdayIST()
  const todayBounds = dayRange(today, today)!
  const yesterdayBounds = dayRange(yesterday, yesterday)!
  const minWithdrawal = await getConfiguredMinWithdrawal()

  if (accountType === 'PUBLISHER') {
    const [
      account,
      todayClicks,
      todayValidClicks,
      todayRows,
      yesterdayRows,
      yesterdaySettlement,
      paidAgg,
      activeAgg,
    ] = await Promise.all([
      prisma.publisher.findUnique({
        where: { id: accountId },
        select: { walletBalance: true, reservedBalance: true },
      }),
      prisma.click.count({
        where: { publisherId: accountId, timestamp: todayBounds },
      }),
      prisma.click.count({
        where: { publisherId: accountId, isValid: true, timestamp: todayBounds },
      }),
      prisma.conversion.findMany({
        where: { publisherId: accountId, isValid: true, createdAt: todayBounds },
        select: { amount: true },
      }),
      prisma.conversion.findMany({
        where: { publisherId: accountId, isValid: true, createdAt: yesterdayBounds },
        select: { amount: true },
      }),
      prisma.dailySettlement.findUnique({
        where: {
          accountType_accountId_settlementDate: {
            accountType: 'PUBLISHER',
            accountId,
            settlementDate: yesterday,
          },
        },
        select: { status: true },
      }),
      prisma.pubWithdrawal.aggregate({
        where: { publisherId: accountId, status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.pubWithdrawal.aggregate({
        where: {
          publisherId: accountId,
          status: { in: ['PENDING', 'APPROVED', 'PROCESSING', 'UNCERTAIN'] },
        },
        _sum: { amount: true },
      }),
    ])

    if (!account) return null

    const todayMicros = todayRows.reduce((s, r) => s + toMicros(r.amount), 0n)
    const yesterdayMicros = yesterdayRows.reduce((s, r) => s + toMicros(r.amount), 0n)
    const availableMicros = toMicros(account.walletBalance)
    const reservedMicros = toMicros(account.reservedBalance)
    const activeWithdrawMicros = toMicros(activeAgg._sum.amount)
    const pendingMicros = reservedMicros > 0n ? reservedMicros : activeWithdrawMicros
    const totalPaidMicros = toMicros(paidAgg._sum.amount)

    const availableBalance = microsToNumber(availableMicros, 2)
    const shortfallToMin = Math.max(0, Number((minWithdrawal - availableBalance).toFixed(2)))

    let yesterdayStatus: FinancialSummary['yesterdaySettlementStatus'] = 'NONE'
    if (yesterdaySettlement) {
      yesterdayStatus = yesterdaySettlement.status as FinancialSummary['yesterdaySettlementStatus']
    } else if (yesterdayMicros > 0n) {
      yesterdayStatus = 'PENDING_SETTLEMENT'
    }

    return {
      timezone: 'Asia/Kolkata',
      todayDate: today,
      yesterdayDate: yesterday,
      todayClicks,
      todayValidClicks,
      todayEarnings: microsToNumber(todayMicros, 4),
      yesterdayEarnings: microsToNumber(yesterdayMicros, 4),
      yesterdaySettlementStatus: yesterdayStatus,
      availableBalance,
      pendingPayment: microsToNumber(pendingMicros, 2),
      totalPaid: microsToNumber(totalPaidMicros, 2),
      minWithdrawal,
      canWithdraw: availableBalance >= minWithdrawal,
      shortfallToMin,
      payoutWindow: getPayoutWindowStatus(),
    }
  }

  // TRAFFIC portal
  const [
    account,
    userLinks,
    todayRows,
    yesterdayRows,
    yesterdaySettlement,
    paidAgg,
    activeAgg,
  ] = await Promise.all([
    prisma.trafficUser.findUnique({
      where: { id: accountId },
      select: { walletBalance: true, reservedBalance: true },
    }),
    prisma.trafficLink.findMany({
      where: { userId: accountId },
      select: { id: true },
    }),
    prisma.trafficEarning.findMany({
      where: { userId: accountId, isValid: true, createdAt: todayBounds },
      select: { amount: true },
    }),
    prisma.trafficEarning.findMany({
      where: { userId: accountId, isValid: true, createdAt: yesterdayBounds },
      select: { amount: true },
    }),
    prisma.dailySettlement.findUnique({
      where: {
        accountType_accountId_settlementDate: {
          accountType: 'TRAFFIC',
          accountId,
          settlementDate: yesterday,
        },
      },
      select: { status: true },
    }),
    prisma.trafficWithdrawal.aggregate({
      where: { userId: accountId, status: 'PAID' },
      _sum: { amount: true },
    }),
    prisma.trafficWithdrawal.aggregate({
      where: {
        userId: accountId,
        status: { in: ['PENDING', 'APPROVED', 'PROCESSING', 'UNCERTAIN'] },
      },
      _sum: { amount: true },
    }),
  ])

  if (!account) return null

  const linkIds = userLinks.map((l) => l.id)
  const [todayClicks, todayValidClicks] =
    linkIds.length > 0
      ? await Promise.all([
          prisma.trafficClick.count({
            where: { trafficLinkId: { in: linkIds }, timestamp: todayBounds },
          }),
          prisma.trafficClick.count({
            where: { trafficLinkId: { in: linkIds }, isUnique: true, timestamp: todayBounds },
          }),
        ])
      : [0, 0]

  const todayMicros = todayRows.reduce((s, r) => s + toMicros(r.amount), 0n)
  const yesterdayMicros = yesterdayRows.reduce((s, r) => s + toMicros(r.amount), 0n)
  const availableMicros = toMicros(account.walletBalance)
  const reservedMicros = toMicros(account.reservedBalance)
  const activeWithdrawMicros = toMicros(activeAgg._sum.amount)
  const pendingMicros = reservedMicros > 0n ? reservedMicros : activeWithdrawMicros
  const totalPaidMicros = toMicros(paidAgg._sum.amount)

  const availableBalance = microsToNumber(availableMicros, 2)
  const shortfallToMin = Math.max(0, Number((minWithdrawal - availableBalance).toFixed(2)))

  let yesterdayStatus: FinancialSummary['yesterdaySettlementStatus'] = 'NONE'
  if (yesterdaySettlement) {
    yesterdayStatus = yesterdaySettlement.status as FinancialSummary['yesterdaySettlementStatus']
  } else if (yesterdayMicros > 0n) {
    yesterdayStatus = 'PENDING_SETTLEMENT'
  }

  return {
    timezone: 'Asia/Kolkata',
    todayDate: today,
    yesterdayDate: yesterday,
    todayClicks,
    todayValidClicks,
    todayEarnings: microsToNumber(todayMicros, 4),
    yesterdayEarnings: microsToNumber(yesterdayMicros, 4),
    yesterdaySettlementStatus: yesterdayStatus,
    availableBalance,
    pendingPayment: microsToNumber(pendingMicros, 2),
    totalPaid: microsToNumber(totalPaidMicros, 2),
    minWithdrawal,
    canWithdraw: availableBalance >= minWithdrawal,
    shortfallToMin,
    payoutWindow: getPayoutWindowStatus(),
  }
}

export interface SettlementRunResult {
  batchRunId: string
  trafficDate: string
  batchDate: string
  settledAccounts: number
  alreadySettledSkipped: number
  adjustmentsCount: number
  totalCredited: number
  status: string
}

/**
 * Idempotent next-day settlement job.
 * Settles validated earnings from historical IST days (< todayIST) into
 * DailySettlement + Publisher/TrafficUser.walletBalance + LedgerTransaction.
 * Protected by PostgreSQL advisory lock + unique(accountType, accountId, settlementDate).
 */
export async function runNextDaySettlement(opts: {
  targetDate?: string | null
  triggeredBy: 'ADMIN' | 'CRON' | 'LOCAL_TRIAL'
  actorAdminId?: string
  actorEmail?: string
}): Promise<SettlementRunResult> {
  const today = todayIST()
  if (opts.targetDate) {
    if (!isDateStr(opts.targetDate)) {
      throw new Error('Invalid targetDate format (expected YYYY-MM-DD)')
    }
    if (opts.targetDate >= today) {
      throw new Error(`Cannot settle ${opts.targetDate}: only completed historical IST days before ${today} can be settled.`)
    }
  }

  const cutoff = opts.targetDate
    ? dayRange(opts.targetDate, opts.targetDate)!
    : { lt: startOfDay(today) }

  const batchDate = today
  const labelDate = opts.targetDate ?? addDays(today, -1)

  return prisma.$transaction(
    async (tx) => {
      // Exclusive lock shared with report clearing so settlement & clearing never race.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(902101)`

      const batch = await tx.settlementBatchRun.create({
        data: {
          batchDate,
          trafficDate: labelDate,
          kind: 'SETTLEMENT',
          status: 'STARTED',
          triggeredBy: opts.triggeredBy,
          actorAdminId: opts.actorAdminId ?? null,
        },
      })

      const [unsettledPub, unsettledTraffic] = await Promise.all([
        tx.conversion.findMany({
          where: { settlementId: null, isValid: true, createdAt: cutoff },
          select: { id: true, publisherId: true, amount: true, createdAt: true },
        }),
        tx.trafficEarning.findMany({
          where: { settlementId: null, isValid: true, createdAt: cutoff },
          select: { id: true, userId: true, amount: true, createdAt: true },
        }),
      ])

      type Group = {
        accountType: AccountType
        accountId: string
        settlementDate: string
        rowIds: string[]
        micros: bigint
      }

      const groups = new Map<string, Group>()

      for (const row of unsettledPub) {
        const d = dateIn(row.createdAt)
        const key = `PUBLISHER|${row.publisherId}|${d}`
        const g = groups.get(key) ?? {
          accountType: 'PUBLISHER',
          accountId: row.publisherId,
          settlementDate: d,
          rowIds: [],
          micros: 0n,
        }
        g.rowIds.push(row.id)
        g.micros += toMicros(row.amount)
        groups.set(key, g)
      }

      for (const row of unsettledTraffic) {
        const d = dateIn(row.createdAt)
        const key = `TRAFFIC|${row.userId}|${d}`
        const g = groups.get(key) ?? {
          accountType: 'TRAFFIC',
          accountId: row.userId,
          settlementDate: d,
          rowIds: [],
          micros: 0n,
        }
        g.rowIds.push(row.id)
        g.micros += toMicros(row.amount)
        groups.set(key, g)
      }

      let settledAccounts = 0
      let alreadySettledSkipped = 0
      let adjustmentsCount = 0
      let totalCreditedMicros = 0n

      for (const group of groups.values()) {
        if (group.micros <= 0n) continue
        const amountDec = microsToDecimal(group.micros)
        const scheduledPayDate = addDays(group.settlementDate, 1)

        const existingSettlement = await tx.dailySettlement.findUnique({
          where: {
            accountType_accountId_settlementDate: {
              accountType: group.accountType,
              accountId: group.accountId,
              settlementDate: group.settlementDate,
            },
          },
        })

        let settlementId: string
        let entryType: 'SETTLEMENT_CREDIT' | 'ADJUSTMENT' = 'SETTLEMENT_CREDIT'
        let idempotencyKey = `settlement:${group.accountType}:${group.accountId}:${group.settlementDate}`

        if (existingSettlement) {
          // Late-arriving valid rows for an already closed day use an explicit ADJUSTMENT entry.
          settlementId = existingSettlement.id
          entryType = 'ADJUSTMENT'
          const sortedIds = [...group.rowIds].sort().join(',')
          idempotencyKey = `adjustment:${group.accountType}:${group.accountId}:${group.settlementDate}:${sortedIds.slice(0, 64)}`
          adjustmentsCount++
        } else {
          const created = await tx.dailySettlement.create({
            data: {
              accountType: group.accountType,
              accountId: group.accountId,
              settlementDate: group.settlementDate,
              scheduledPayDate,
              grossAmount: amountDec,
              conversionCount: group.rowIds.length,
              status: 'SETTLED',
              batchRunId: batch.id,
            },
          })
          settlementId = created.id
          settledAccounts++
        }

        // Check ledger idempotency before crediting balance
        const existingLedger = await tx.ledgerTransaction.findUnique({
          where: { idempotencyKey },
          select: { id: true },
        })
        if (existingLedger) {
          alreadySettledSkipped++
          continue
        }

        let balanceAfter: Prisma.Decimal
        let reservedAfter: Prisma.Decimal
        const now = new Date()

        if (group.accountType === 'PUBLISHER') {
          await tx.conversion.updateMany({
            where: { id: { in: group.rowIds }, settlementId: null },
            data: { settlementId, settledAt: now },
          })
          const updated = await tx.publisher.update({
            where: { id: group.accountId },
            data: { walletBalance: { increment: amountDec } },
            select: { walletBalance: true, reservedBalance: true },
          })
          balanceAfter = updated.walletBalance
          reservedAfter = updated.reservedBalance
        } else {
          await tx.trafficEarning.updateMany({
            where: { id: { in: group.rowIds }, settlementId: null },
            data: { settlementId, settledAt: now },
          })
          const updated = await tx.trafficUser.update({
            where: { id: group.accountId },
            data: { walletBalance: { increment: amountDec } },
            select: { walletBalance: true, reservedBalance: true },
          })
          balanceAfter = updated.walletBalance
          reservedAfter = updated.reservedBalance
        }

        await tx.ledgerTransaction.create({
          data: {
            accountType: group.accountType,
            accountId: group.accountId,
            entryType,
            direction: 'CREDIT',
            amount: amountDec,
            balanceAfter,
            reservedAfter,
            referenceType: 'DAILY_SETTLEMENT',
            referenceId: settlementId,
            idempotencyKey,
            actorAdminId: opts.actorAdminId ?? null,
            note: `Next-day settlement for ${group.settlementDate} IST (${group.rowIds.length} records)`,
          },
        })

        totalCreditedMicros += group.micros
      }

      const finalStatus = 'COMPLETED'
      await tx.settlementBatchRun.update({
        where: { id: batch.id },
        data: {
          status: finalStatus,
          eligibleCount: settledAccounts + adjustmentsCount,
          totalAmount: microsToDecimal(totalCreditedMicros),
          completedAt: new Date(),
          notes: `Settled ${settledAccounts} account-day groups, ${adjustmentsCount} late adjustments.`,
        },
      })

      if (opts.actorAdminId) {
        await tx.adminAuditLog.create({
          data: {
            actorAdminId: opts.actorAdminId,
            actorEmail: opts.actorEmail ?? null,
            action: 'SETTLEMENT_RUN',
            targetType: 'SETTLEMENT_BATCH',
            targetId: batch.id,
            dates: [labelDate],
            affectedCount: settledAccounts + adjustmentsCount,
            outcome: 'SUCCESS',
            metadata: {
              totalCredited: microsToNumber(totalCreditedMicros, 4),
              triggeredBy: opts.triggeredBy,
            },
          },
        })
      }

      return {
        batchRunId: batch.id,
        trafficDate: labelDate,
        batchDate,
        settledAccounts,
        alreadySettledSkipped,
        adjustmentsCount,
        totalCredited: microsToNumber(totalCreditedMicros, 4),
        status: finalStatus,
      }
    },
    { timeout: 25000 }
  )
}

