import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import {
  APP_TIMEZONE,
  dateIn,
  dayRange,
  enumerateDateRange,
  isDateStr,
  todayIST,
} from '@/lib/appTime'
import { microsToDecimal, microsToNumber, toMicros } from '@/lib/money'

export interface DailyReportPublisherBreakdown {
  accountType: 'PUBLISHER' | 'TRAFFIC'
  accountId: string
  name: string
  email: string
  totalClicks: number
  validClicks: number
  conversionsCount: number
  earnings: number
  settlementStatus: string
}

export interface DailyReportRow {
  date: string
  totalClicks: number
  validClicks: number
  conversionsCount: number
  earnings: number
  publisherCount: number
  reportStatus: 'ACTIVE' | 'CLEARED' | 'RESTORED'
  settlementStatus: 'SETTLED' | 'PARTIAL' | 'PENDING_SETTLEMENT' | 'NONE'
  paymentStatus: 'PAID' | 'UNPAID_OR_PENDING' | 'NONE'
  clearedMeta: {
    backupId: string
    clearedAt: string
    reason: string
  } | null
  breakdown: DailyReportPublisherBreakdown[]
}

export async function getDateWiseTrafficReports(opts: {
  dates?: string[]
  from?: string | null
  to?: string | null
  includeCleared?: boolean
  onlyCleared?: boolean
  publisherId?: string | null
}) {
  const today = todayIST()

  // Resolve requested IST date range or explicit multi-date filter
  let targetDates: string[] | null = null
  if (opts.dates && opts.dates.length > 0) {
    targetDates = Array.from(new Set(opts.dates.filter(isDateStr))).sort().reverse()
  } else if (opts.from && opts.to) {
    targetDates = enumerateDateRange(opts.from, opts.to, 90).reverse()
  }

  let createdBounds: { gte?: Date; lt?: Date } | undefined
  if (targetDates && targetDates.length > 0) {
    const minDate = targetDates[targetDates.length - 1]
    const maxDate = targetDates[0]
    createdBounds = dayRange(minDate, maxDate)
  } else {
    createdBounds = dayRange(opts.from ?? null, opts.to ?? null)
  }

  const pubFilter = opts.publisherId ? { publisherId: opts.publisherId } : {}

  const [
    pubClicks,
    pubConversions,
    trafficClicks,
    trafficEarnings,
    settlements,
    clearedRows,
    publishers,
    trafficUsers,
    paidWithdrawalsCount,
  ] = await Promise.all([
    prisma.click.findMany({
      where: { ...pubFilter, ...(createdBounds ? { timestamp: createdBounds } : {}) },
      select: { publisherId: true, isValid: true, timestamp: true },
    }),
    prisma.conversion.findMany({
      where: { ...pubFilter, ...(createdBounds ? { createdAt: createdBounds } : {}) },
      select: { publisherId: true, amount: true, isValid: true, settlementId: true, createdAt: true },
    }),
    opts.publisherId
      ? Promise.resolve([])
      : prisma.trafficClick.findMany({
          where: createdBounds ? { timestamp: createdBounds } : {},
          select: { isUnique: true, timestamp: true, trafficLink: { select: { userId: true } } },
        }),
    opts.publisherId
      ? Promise.resolve([])
      : prisma.trafficEarning.findMany({
          where: createdBounds ? { createdAt: createdBounds } : {},
          select: { userId: true, amount: true, isValid: true, settlementId: true, createdAt: true },
        }),
    prisma.dailySettlement.findMany({
      select: { accountType: true, accountId: true, settlementDate: true, status: true },
    }),
    prisma.clearedTrafficReportDate.findMany({
      orderBy: { reportDate: 'desc' },
    }),
    prisma.publisher.findMany({
      select: { id: true, name: true, email: true, walletBalance: true },
    }),
    prisma.trafficUser.findMany({
      select: { id: true, name: true, email: true, walletBalance: true },
    }),
    prisma.pubWithdrawal.count({ where: { status: 'PAID' } }),
  ])

  const pubMap = new Map(publishers.map((p) => [p.id, p]))
  const trafficMap = new Map(trafficUsers.map((t) => [t.id, t]))
  const clearedMap = new Map(clearedRows.map((c) => [c.reportDate, c]))
  const settlementMap = new Map(
    settlements.map((s) => [`${s.accountType}|${s.accountId}|${s.settlementDate}`, s.status])
  )

  type DayAcc = {
    totalClicks: number
    validClicks: number
    conversionsCount: number
    earningsMicros: bigint
    unsettledCount: number
    settledCount: number
    accounts: Map<string, {
      accountType: 'PUBLISHER' | 'TRAFFIC'
      accountId: string
      totalClicks: number
      validClicks: number
      conversionsCount: number
      earningsMicros: bigint
    }>
  }

  const days = new Map<string, DayAcc>()
  const ensureDay = (d: string): DayAcc => {
    let acc = days.get(d)
    if (!acc) {
      acc = {
        totalClicks: 0,
        validClicks: 0,
        conversionsCount: 0,
        earningsMicros: 0n,
        unsettledCount: 0,
        settledCount: 0,
        accounts: new Map(),
      }
      days.set(d, acc)
    }
    return acc
  }
  const ensureAccount = (day: DayAcc, accountType: 'PUBLISHER' | 'TRAFFIC', accountId: string) => {
    const k = `${accountType}|${accountId}`
    let a = day.accounts.get(k)
    if (!a) {
      a = {
        accountType,
        accountId,
        totalClicks: 0,
        validClicks: 0,
        conversionsCount: 0,
        earningsMicros: 0n,
      }
      day.accounts.set(k, a)
    }
    return a
  }

  for (const c of pubClicks) {
    const d = dateIn(c.timestamp)
    if (targetDates && !targetDates.includes(d)) continue
    const day = ensureDay(d)
    day.totalClicks += 1
    if (c.isValid) day.validClicks += 1
    const acct = ensureAccount(day, 'PUBLISHER', c.publisherId)
    acct.totalClicks += 1
    if (c.isValid) acct.validClicks += 1
  }

  for (const c of pubConversions) {
    const d = dateIn(c.createdAt)
    if (targetDates && !targetDates.includes(d)) continue
    const day = ensureDay(d)
    const acct = ensureAccount(day, 'PUBLISHER', c.publisherId)
    if (c.isValid) {
      day.conversionsCount += 1
      const m = toMicros(c.amount)
      day.earningsMicros += m
      acct.conversionsCount += 1
      acct.earningsMicros += m
      if (c.settlementId) day.settledCount += 1
      else day.unsettledCount += 1
    }
  }

  for (const tc of trafficClicks) {
    const d = dateIn(tc.timestamp)
    if (targetDates && !targetDates.includes(d)) continue
    const day = ensureDay(d)
    day.totalClicks += 1
    if (tc.isUnique) day.validClicks += 1
    const acct = ensureAccount(day, 'TRAFFIC', tc.trafficLink.userId)
    acct.totalClicks += 1
    if (tc.isUnique) acct.validClicks += 1
  }

  for (const te of trafficEarnings) {
    const d = dateIn(te.createdAt)
    if (targetDates && !targetDates.includes(d)) continue
    const day = ensureDay(d)
    const acct = ensureAccount(day, 'TRAFFIC', te.userId)
    if (te.isValid) {
      day.conversionsCount += 1
      const m = toMicros(te.amount)
      day.earningsMicros += m
      acct.conversionsCount += 1
      acct.earningsMicros += m
      if (te.settlementId) day.settledCount += 1
      else day.unsettledCount += 1
    }
  }

  // Also include cleared dates that might be explicitly queried even if filtered
  for (const cr of clearedRows) {
    if (targetDates && !targetDates.includes(cr.reportDate)) continue
    ensureDay(cr.reportDate)
  }

  const allRows: DailyReportRow[] = Array.from(days.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, day]) => {
      const cleared = clearedMap.get(date)
      const reportStatus: DailyReportRow['reportStatus'] = cleared
        ? (cleared.status as 'CLEARED' | 'RESTORED')
        : 'ACTIVE'

      let settlementStatus: DailyReportRow['settlementStatus'] = 'NONE'
      if (day.earningsMicros > 0n) {
        if (day.unsettledCount === 0 && day.settledCount > 0) settlementStatus = 'SETTLED'
        else if (day.settledCount > 0 && day.unsettledCount > 0) settlementStatus = 'PARTIAL'
        else settlementStatus = 'PENDING_SETTLEMENT'
      }

      const breakdown: DailyReportPublisherBreakdown[] = Array.from(day.accounts.values())
        .map((a) => {
          const profile =
            a.accountType === 'PUBLISHER' ? pubMap.get(a.accountId) : trafficMap.get(a.accountId)
          return {
            accountType: a.accountType,
            accountId: a.accountId,
            name: profile?.name ?? 'Unknown Account',
            email: profile?.email ?? '',
            totalClicks: a.totalClicks,
            validClicks: a.validClicks,
            conversionsCount: a.conversionsCount,
            earnings: microsToNumber(a.earningsMicros, 4),
            settlementStatus:
              settlementMap.get(`${a.accountType}|${a.accountId}|${date}`) ??
              (a.earningsMicros > 0n ? 'PENDING_SETTLEMENT' : 'NONE'),
          }
        })
        .sort((x, y) => y.earnings - x.earnings || y.totalClicks - x.totalClicks)

      return {
        date,
        totalClicks: day.totalClicks,
        validClicks: day.validClicks,
        conversionsCount: day.conversionsCount,
        earnings: microsToNumber(day.earningsMicros, 4),
        publisherCount: breakdown.length,
        reportStatus,
        settlementStatus,
        paymentStatus:
          settlementStatus === 'SETTLED' && paidWithdrawalsCount > 0
            ? 'PAID'
            : day.earningsMicros > 0n
            ? 'UNPAID_OR_PENDING'
            : 'NONE',
        clearedMeta:
          cleared && cleared.status === 'CLEARED'
            ? {
                backupId: cleared.backupId,
                clearedAt: cleared.clearedAt.toISOString(),
                reason: cleared.reason,
              }
            : null,
        breakdown,
      }
    })

  const visibleRows = allRows.filter((r) => {
    if (opts.onlyCleared) return r.reportStatus === 'CLEARED'
    if (opts.includeCleared) return true
    return r.reportStatus !== 'CLEARED'
  })

  const archivedCount = allRows.filter((r) => r.reportStatus === 'CLEARED').length

  return {
    timezone: APP_TIMEZONE,
    today,
    archivedCount,
    rows: visibleRows,
    clearedRows: allRows.filter((r) => r.reportStatus === 'CLEARED'),
  }
}

export class ReportClearError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export async function previewReportClear(datesInput: string[]) {
  const dates = Array.from(new Set(datesInput.filter(isDateStr))).sort()
  if (dates.length === 0) {
    throw new ReportClearError('No valid YYYY-MM-DD dates provided', 400)
  }

  const today = todayIST()
  const activeBatch = await prisma.settlementBatchRun.findFirst({
    where: { status: 'STARTED' },
    select: { id: true, batchDate: true },
  })
  const processingWithdrawals = await prisma.pubWithdrawal.count({
    where: { status: 'PROCESSING' },
  })

  const items = await Promise.all(
    dates.map(async (d) => {
      const bounds = dayRange(d, d)!
      const [
        pubClicks,
        pubValidClicks,
        trafficClicks,
        trafficValidClicks,
        pubConvs,
        trafficEarns,
        existingClear,
      ] = await Promise.all([
        prisma.click.count({ where: { timestamp: bounds } }),
        prisma.click.count({ where: { isValid: true, timestamp: bounds } }),
        prisma.trafficClick.count({ where: { timestamp: bounds } }),
        prisma.trafficClick.count({ where: { isUnique: true, timestamp: bounds } }),
        prisma.conversion.findMany({
          where: { createdAt: bounds },
          select: { publisherId: true, amount: true, isValid: true, settlementId: true },
        }),
        prisma.trafficEarning.findMany({
          where: { createdAt: bounds },
          select: { userId: true, amount: true, isValid: true, settlementId: true },
        }),
        prisma.clearedTrafficReportDate.findUnique({ where: { reportDate: d } }),
      ])

      const unsettledPub = pubConvs.filter((c) => c.isValid && !c.settlementId).length
      const unsettledTraffic = trafficEarns.filter((e) => e.isValid && !e.settlementId).length
      const totalEarningsMicros =
        pubConvs.filter((c) => c.isValid).reduce((s, c) => s + toMicros(c.amount), 0n) +
        trafficEarns.filter((e) => e.isValid).reduce((s, e) => s + toMicros(e.amount), 0n)

      const accounts = new Set<string>([
        ...pubConvs.map((c) => `P:${c.publisherId}`),
        ...trafficEarns.map((e) => `T:${e.userId}`),
      ])

      const blockReasons: string[] = []
      if (d >= today) {
        blockReasons.push(
          `Date ${d} is today or in the future (${APP_TIMEZONE}). Current-day reports cannot be cleared while traffic is still being processed.`
        )
      }
      if (unsettledPub > 0 || unsettledTraffic > 0) {
        blockReasons.push(
          `Date ${d} has ${unsettledPub + unsettledTraffic} unsettled valid earning record(s). Run Next-Day Settlement first so financial obligations are independently preserved in the ledger before clearing.`
        )
      }
      if (activeBatch || processingWithdrawals > 0) {
        blockReasons.push(
          'A settlement batch or payout processing job is currently active. Retry once it finishes.'
        )
      }

      const alreadyCleared = existingClear?.status === 'CLEARED'

      return {
        date: d,
        totalClicks: pubClicks + trafficClicks,
        validClicks: pubValidClicks + trafficValidClicks,
        earnings: microsToNumber(totalEarningsMicros, 4),
        publisherCount: accounts.size,
        unsettledCount: unsettledPub + unsettledTraffic,
        alreadyCleared,
        safeToClear: blockReasons.length === 0,
        blockReasons,
      }
    })
  )

  const hasBlocked = items.some((i) => !i.safeToClear)
  const requiresSecondConfirmation = dates.length > 3

  return {
    today,
    dates,
    requiresSecondConfirmation,
    allSafe: !hasBlocked,
    totals: {
      totalClicks: items.reduce((s, i) => s + i.totalClicks, 0),
      validClicks: items.reduce((s, i) => s + i.validClicks, 0),
      earnings: Number(items.reduce((s, i) => s + i.earnings, 0).toFixed(4)),
    },
    items,
  }
}

export async function executeReportClear(opts: {
  dates: string[]
  reason: string
  adminId: string
  adminEmail?: string
  confirmedLargeRange?: boolean
  simulateBackupFailure?: boolean
}) {
  const dates = Array.from(new Set(opts.dates.filter(isDateStr))).sort()
  if (dates.length === 0) throw new ReportClearError('No valid dates selected', 400)
  if (dates.length > 3 && !opts.confirmedLargeRange) {
    throw new ReportClearError(
      'Clearing more than 3 dates requires explicit large-range confirmation.',
      400
    )
  }

  const today = todayIST()

  return prisma.$transaction(
    async (tx) => {
      // Lock shared with settlement job to prevent concurrent settlement/clear corruption.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(902101)`

      // Validate every date inside the transaction
      const activeBatch = await tx.settlementBatchRun.findFirst({
        where: { status: 'STARTED' },
        select: { id: true },
      })
      if (activeBatch) {
        throw new ReportClearError('A settlement batch is currently in progress. Try again shortly.', 409)
      }

      const dateSnapshots: Array<{
        date: string
        totalClicks: number
        validClicks: number
        earningsMicros: bigint
        alreadyCleared: boolean
        clickIds: string[]
        trafficClickIds: string[]
        conversionIds: string[]
        trafficEarningIds: string[]
      }> = []

      for (const d of dates) {
        if (d >= today) {
          await tx.adminAuditLog.create({
            data: {
              actorAdminId: opts.adminId,
              actorEmail: opts.adminEmail ?? null,
              action: 'REPORT_CLEAR',
              targetType: 'TRAFFIC_REPORT',
              dates,
              reason: opts.reason,
              outcome: 'BLOCKED',
              metadata: { blockedDate: d, cause: 'current_or_future_date' },
            },
          })
          throw new ReportClearError(
            `Blocked: ${d} is today or a future date in ${APP_TIMEZONE}. Only completed historical dates can be cleared.`,
            400
          )
        }

        const bounds = dayRange(d, d)!
        const [clicks, trafficClicks, conversions, trafficEarnings, existingClear] = await Promise.all([
          tx.click.findMany({
            where: { timestamp: bounds },
            select: { id: true, isValid: true },
          }),
          tx.trafficClick.findMany({
            where: { timestamp: bounds },
            select: { id: true, isUnique: true },
          }),
          tx.conversion.findMany({
            where: { createdAt: bounds },
            select: { id: true, amount: true, isValid: true, settlementId: true },
          }),
          tx.trafficEarning.findMany({
            where: { createdAt: bounds },
            select: { id: true, amount: true, isValid: true, settlementId: true },
          }),
          tx.clearedTrafficReportDate.findUnique({ where: { reportDate: d } }),
        ])

        const unsettledCount =
          conversions.filter((c) => c.isValid && !c.settlementId).length +
          trafficEarnings.filter((e) => e.isValid && !e.settlementId).length

        if (unsettledCount > 0) {
          throw new ReportClearError(
            `Blocked: ${d} has ${unsettledCount} unsettled valid conversion(s). Settle historical earnings first so financial obligations remain preserved independently.`,
            409
          )
        }

        const earningsMicros =
          conversions.filter((c) => c.isValid).reduce((s, c) => s + toMicros(c.amount), 0n) +
          trafficEarnings.filter((e) => e.isValid).reduce((s, e) => s + toMicros(e.amount), 0n)

        dateSnapshots.push({
          date: d,
          totalClicks: clicks.length + trafficClicks.length,
          validClicks:
            clicks.filter((c) => c.isValid).length + trafficClicks.filter((t) => t.isUnique).length,
          earningsMicros,
          alreadyCleared: existingClear?.status === 'CLEARED',
          clickIds: clicks.map((c) => c.id),
          trafficClickIds: trafficClicks.map((t) => t.id),
          conversionIds: conversions.map((c) => c.id),
          trafficEarningIds: trafficEarnings.map((e) => e.id),
        })
      }

      const toClear = dateSnapshots.filter((s) => !s.alreadyCleared)
      if (toClear.length === 0) {
        return {
          clearedDates: [] as string[],
          alreadyClearedDates: dates,
          backupId: null as string | null,
          affectedRecords: 0,
          message: 'Selected dates were already cleared. No duplicate changes applied.',
        }
      }

      // Build and verify restricted backup BEFORE clearing report visibility.
      const payloadObj = {
        schemaVersion: 1,
        timezone: APP_TIMEZONE,
        backedUpAt: new Date().toISOString(),
        createdByAdminId: opts.adminId,
        reason: opts.reason,
        dates: toClear.map((s) => ({
          ...s,
          earnings: microsToNumber(s.earningsMicros, 4),
          earningsMicros: undefined,
        })),
      }
      const payloadJson = JSON.stringify(payloadObj)
      const checksumSha256 = createHash('sha256').update(payloadJson).digest('hex')
      const recordCount = toClear.reduce(
        (sum, s) => sum + s.totalClicks + s.conversionIds.length + s.trafficEarningIds.length,
        0
      )

      if (opts.simulateBackupFailure) {
        throw new ReportClearError('Backup creation/verification failed — aborting report clear without modifying any reports.', 500)
      }

      const backup = await tx.trafficReportBackup.create({
        data: {
          reportDates: toClear.map((s) => s.date),
          portalScope: 'ALL',
          checksumSha256,
          payloadJson,
          recordCount,
          verifiedAt: new Date(),
          createdByAdminId: opts.adminId,
        },
      })

      // Read-back verification of checksum
      const verified = await tx.trafficReportBackup.findUnique({
        where: { id: backup.id },
        select: { checksumSha256: true, payloadJson: true },
      })
      const recomputed = verified
        ? createHash('sha256').update(verified.payloadJson).digest('hex')
        : ''
      if (!verified || recomputed !== checksumSha256) {
        throw new ReportClearError('Backup integrity verification failed — clearing aborted.', 500)
      }

      for (const s of toClear) {
        await tx.clearedTrafficReportDate.upsert({
          where: { reportDate: s.date },
          create: {
            reportDate: s.date,
            status: 'CLEARED',
            backupId: backup.id,
            clearedByAdminId: opts.adminId,
            reason: opts.reason,
            snapshotTotalClicks: s.totalClicks,
            snapshotValidClicks: s.validClicks,
            snapshotEarnings: microsToDecimal(s.earningsMicros),
          },
          update: {
            status: 'CLEARED',
            backupId: backup.id,
            clearedByAdminId: opts.adminId,
            clearedAt: new Date(),
            reason: opts.reason,
            snapshotTotalClicks: s.totalClicks,
            snapshotValidClicks: s.validClicks,
            snapshotEarnings: microsToDecimal(s.earningsMicros),
            restoredByAdminId: null,
            restoredAt: null,
            restoreReason: null,
          },
        })
      }

      await tx.adminAuditLog.create({
        data: {
          actorAdminId: opts.adminId,
          actorEmail: opts.adminEmail ?? null,
          action: 'REPORT_CLEAR',
          targetType: 'TRAFFIC_REPORT',
          targetId: backup.id,
          dates: toClear.map((s) => s.date),
          affectedCount: recordCount,
          reason: opts.reason,
          outcome: 'SUCCESS',
          backupId: backup.id,
          metadata: {
            checksumSha256,
            financialBalancesModified: false,
          },
        },
      })

      return {
        clearedDates: toClear.map((s) => s.date),
        alreadyClearedDates: dateSnapshots.filter((s) => s.alreadyCleared).map((s) => s.date),
        backupId: backup.id,
        checksumSha256,
        affectedRecords: recordCount,
        message: 'Traffic reports archived/cleared safely. Wallet balances and payment history were not changed.',
      }
    },
    { timeout: 25000 }
  )
}

export async function restoreClearedReports(opts: {
  dates: string[]
  reason: string
  adminId: string
  adminEmail?: string
}) {
  const dates = Array.from(new Set(opts.dates.filter(isDateStr))).sort()
  if (dates.length === 0) throw new ReportClearError('No valid dates selected', 400)

  return prisma.$transaction(async (tx) => {
    const cleared = await tx.clearedTrafficReportDate.findMany({
      where: { reportDate: { in: dates }, status: 'CLEARED' },
    })

    if (cleared.length === 0) {
      return { restoredDates: [] as string[], message: 'No cleared reports found for selected dates.' }
    }

    const now = new Date()
    await tx.clearedTrafficReportDate.updateMany({
      where: { reportDate: { in: cleared.map((c) => c.reportDate) } },
      data: {
        status: 'RESTORED',
        restoredByAdminId: opts.adminId,
        restoredAt: now,
        restoreReason: opts.reason,
      },
    })

    await tx.adminAuditLog.create({
      data: {
        actorAdminId: opts.adminId,
        actorEmail: opts.adminEmail ?? null,
        action: 'REPORT_RESTORE',
        targetType: 'TRAFFIC_REPORT',
        dates: cleared.map((c) => c.reportDate),
        affectedCount: cleared.length,
        reason: opts.reason,
        outcome: 'SUCCESS',
        metadata: {
          note: 'Report visibility restored only; zero financial credits or wallet mutations performed.',
        },
      },
    })

    return {
      restoredDates: cleared.map((c) => c.reportDate),
      message: 'Cleared reports restored to active view without altering any wallet balances or earnings.',
    }
  })
}

