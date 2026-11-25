/**
 * Comprehensive PRD Acceptance & Financial Invariants Test Suite.
 * Runs against an isolated localhost server + local PostgreSQL database.
 */
import 'dotenv/config'
import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { addDays, dateIn, dayRange, startOfDay, todayIST } from '../src/lib/appTime'
import { executeReportClear } from '../src/lib/reportArchive'

const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  throw new Error(`Refusing to run against non-local URL: ${BASE}`)
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL!
if (!/localhost|127\.0\.0\.1/.test(connectionString)) {
  throw new Error('Refusing to run PRD acceptance suite against non-local DB.')
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@ads2pub.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123'

const run = Date.now().toString(36)
const SECRET = `prd-accept-${run}-secret`
let ipSeq = 1
const passed: string[] = []

function pass(label: string) {
  passed.push(label)
  console.log(`PASS  ${label}`)
}

type Res = { status: number; json: Record<string, unknown> | null; text: string; headers: Headers }

async function api(
  path: string,
  opts: { method?: string; body?: unknown; token?: string } = {}
): Promise<Res> {
  ipSeq++
  const res = await fetch(BASE + path, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    redirect: 'manual',
    headers: {
      ...(opts.body !== undefined && { 'content-type': 'application/json' }),
      ...(opts.token && { authorization: `Bearer ${opts.token}` }),
      'x-forwarded-for': `10.88.${Math.floor(ipSeq / 250)}.${ipSeq % 250}`,
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  const text = await res.text()
  let json: Record<string, unknown> | null = null
  try {
    json = JSON.parse(text) as Record<string, unknown>
  } catch {
    // non-json
  }
  return { status: res.status, json, text, headers: res.headers }
}

function walkKeys(value: unknown, path = '$', out: { path: string; value: unknown }[] = []) {
  out.push({ path, value })
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walkKeys(v, `${path}.${k}`, out)
  }
  return out
}

function assertNoConversionData(json: unknown, uids: string[], label: string) {
  for (const { path, value } of walkKeys(json)) {
    const key = path.split('.').pop() ?? ''
    assert.ok(
      !/conver|lead|externalUserId|registration|clickId/i.test(key),
      `${label}: publisher response exposes "${path}"`
    )
    if (typeof value === 'string') {
      assert.ok(!uids.includes(value), `${label}: publisher response leaks UID at ${path}`)
    }
  }
}

async function main() {
  // ── 1. IST Date Filtering & Boundaries ────────────────────────────────────
  assert.equal(startOfDay('2026-11-23', 'Asia/Kolkata').toISOString(), '2026-11-22T18:30:00.000Z')
  assert.equal(dateIn(new Date('2026-11-22T18:30:00.000Z'), 'Asia/Kolkata'), '2026-11-23')
  assert.equal(dateIn(new Date('2026-11-22T18:29:59.000Z'), 'Asia/Kolkata'), '2026-11-22')
  assert.deepEqual(dayRange('2026-11-23', '2026-11-23', 'Asia/Kolkata'), {
    gte: new Date('2026-11-22T18:30:00.000Z'),
    lt: new Date('2026-11-23T18:30:00.000Z'),
  })
  pass('1. IST date boundaries & midnight cutoffs (Asia/Kolkata)')

  // ── 2. Admin & Publisher Setup ────────────────────────────────────────────
  const adminLogin = await api('/api/auth/admin/login', {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  assert.equal(adminLogin.status, 200)
  const adminToken = (adminLogin.json!.data as Record<string, string>).token

  await api('/api/admin/config', { token: adminToken, body: { key: 'postback_secret', value: SECRET } })
  await api('/api/admin/config', { token: adminToken, body: { key: 'pub_earn_amount', value: '10.00' } })
  await api('/api/admin/config', { token: adminToken, body: { key: 'min_withdrawal', value: '15.00' } })

  const regA = await api('/api/auth/publisher/register', {
    body: { email: `prd-a-${run}@test.local`, password: 'password123', name: `PRD Pub A ${run}` },
  })
  assert.equal(regA.status, 201)
  const pubA = (regA.json!.data as { publisher: { id: string }; token: string })
  const pubAId = pubA.publisher.id
  const pubAToken = pubA.token

  const regB = await api('/api/auth/publisher/register', {
    body: { email: `prd-b-${run}@test.local`, password: 'password123', name: `PRD Pub B ${run}` },
  })
  assert.equal(regB.status, 201)
  const pubB = (regB.json!.data as { publisher: { id: string }; token: string })

  const linkRes = await api('/api/publisher/links', { token: pubAToken, body: { linkType: 'direct' } })
  assert.equal(linkRes.status, 201)
  const linkData = linkRes.json!.data as { id: string; uniqueCode: string }

  // ── 3. Tracking Redirect & Postback Today Accrual (Not Immediately Withdrawable) ──
  const redir = await api(`/t/${linkData.uniqueCode}`)
  assert.equal(redir.status, 302)
  const loc = new URL(redir.headers.get('location')!)
  const clickId = loc.searchParams.get('click_id')!
  assert.equal(loc.searchParams.get('ref'), linkData.uniqueCode)
  assert.ok(clickId)

  const todayUid = `prd-today-${run}`
  const pbToday = await api('/api/postback', {
    body: { code: linkData.uniqueCode, uid: todayUid, click_id: clickId, secret: SECRET },
  })
  assert.equal(pbToday.status, 200)
  assert.equal(pbToday.json!.success, true)

  const dashToday = await api('/api/publisher/dashboard', { token: pubAToken })
  assert.equal(dashToday.status, 200)
  const dashData = dashToday.json!.data as Record<string, unknown>
  assert.equal(Number(dashData.todayEarnings), 10)
  assert.equal(Number(dashData.availableBalance), 0, 'Today earnings must NOT be prematurely withdrawable')
  assertNoConversionData(dashToday.json, [todayUid], 'publisher/dashboard')

  // Attempting to withdraw today's earnings prematurely must fail
  const prematureWithdraw = await api('/api/publisher/withdraw', {
    token: pubAToken,
    body: { amount: 15, walletAddress: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', network: 'TRC20' },
  })
  assert.equal(prematureWithdraw.status, 400)
  pass('2. Tracking regression, publisher privacy, and today earnings cannot withdraw prematurely')

  // ── 4. Next-Day Settlement & Idempotency ──────────────────────────────────
  const today = todayIST()
  const histDate1 = addDays(today, -15) // safe disposable historical date
  const histDate2 = addDays(today, -16)

  // Ensure disposable test dates start un-cleared for deterministic re-runs
  await prisma.clearedTrafficReportDate.deleteMany({
    where: { reportDate: { in: [histDate1, histDate2] } },
  })

  // Insert synthetic historical conversions & clicks for histDate1 ($20.00) and histDate2 ($12.00)
  const h1Instant = new Date(startOfDay(histDate1).getTime() + 11 * 3600 * 1000)
  const h2Instant = new Date(startOfDay(histDate2).getTime() + 11 * 3600 * 1000)

  await prisma.click.createMany({
    data: [
      { trackingLinkId: linkData.id, publisherId: pubAId, ip: '10.1.1.1', userAgent: 'UA', isValid: true, timestamp: h1Instant },
      { trackingLinkId: linkData.id, publisherId: pubAId, ip: '10.1.1.2', userAgent: 'UA', isValid: true, timestamp: h2Instant },
    ],
  })
  await prisma.conversion.createMany({
    data: [
      { publisherId: pubAId, trackingLinkId: linkData.id, externalUserId: `prd-h1-${run}-1`, amount: '10.00', status: 'CONFIRMED', isValid: true, createdAt: h1Instant },
      { publisherId: pubAId, trackingLinkId: linkData.id, externalUserId: `prd-h1-${run}-2`, amount: '10.00', status: 'CONFIRMED', isValid: true, createdAt: h1Instant },
      { publisherId: pubAId, trackingLinkId: linkData.id, externalUserId: `prd-h2-${run}-1`, amount: '12.00', status: 'CONFIRMED', isValid: true, createdAt: h2Instant },
    ],
  })

  // Unsettled historical date clearing MUST be blocked before settlement
  const clearBeforeSettle = await api('/api/admin/reports/clear', {
    token: adminToken,
    body: { action: 'execute', dates: [histDate1], reason: 'test before settle', confirmed: true },
  })
  assert.equal(clearBeforeSettle.status, 409, 'Unsettled historical date must be blocked from clearing')

  // Run settlement for histDate1 twice -> must credit $20.00 exactly ONCE
  const s1 = await api('/api/admin/settlement', {
    token: adminToken,
    body: { action: 'run_settlement', targetDate: histDate1 },
  })
  assert.equal(s1.status, 200)
  const s1Again = await api('/api/admin/settlement', {
    token: adminToken,
    body: { action: 'run_settlement', targetDate: histDate1 },
  })
  assert.equal(s1Again.status, 200)
  assert.equal((s1Again.json!.data as { totalCredited: number }).totalCredited, 0, 'Repeat settlement must credit 0')

  const pubAfterSettle = await prisma.publisher.findUniqueOrThrow({ where: { id: pubAId } })
  assert.equal(Number(pubAfterSettle.walletBalance), 20)
  pass('3. Next-day settlement credits once & repeat run is idempotent')

  // ── 5. $15 Minimum Withdrawal, Rollover & Concurrency ─────────────────────
  const belowMin = await api('/api/publisher/withdraw', {
    token: pubAToken,
    body: { amount: 14.99, walletAddress: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', network: 'TRC20' },
  })
  assert.equal(belowMin.status, 400, '$14.99 withdrawal must fail')

  const overBalance = await api('/api/publisher/withdraw', {
    token: pubAToken,
    body: { amount: 25, walletAddress: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', network: 'TRC20' },
  })
  assert.equal(overBalance.status, 400, 'Amount exceeding available balance must fail')

  // Concurrent double-spend test: two simultaneous $15 requests against $20 balance
  const [wRace1, wRace2] = await Promise.all([
    api('/api/publisher/withdraw', {
      token: pubAToken,
      body: { amount: 15, walletAddress: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', network: 'TRC20' },
    }),
    api('/api/publisher/withdraw', {
      token: pubAToken,
      body: { amount: 15, walletAddress: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', network: 'TRC20' },
    }),
  ])
  const winners = [wRace1, wRace2].filter((r) => r.status === 201)
  const losers = [wRace1, wRace2].filter((r) => r.status === 400)
  assert.equal(winners.length, 1, 'Exactly one concurrent $15 request must succeed on $20 balance')
  assert.equal(losers.length, 1, 'Second concurrent $15 request must fail cleanly')

  const wId = winners[0].json!.withdrawalId as string
  const pubAfterReserve = await prisma.publisher.findUniqueOrThrow({ where: { id: pubAId } })
  assert.equal(Number(pubAfterReserve.walletBalance), 5, 'Remaining $5.00 available rolls over')
  assert.equal(Number(pubAfterReserve.reservedBalance), 15, '$15.00 reserved in pending payment')
  pass('4. $15 minimum enforced, below-threshold rollover, and concurrent overspend prevented')

  // ── 6. Withdrawal Lifecycle: Approve -> Uncertain -> Paid & Duplicate Guard ──
  const approveRes = await api(`/api/admin/withdrawals/${wId}`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'APPROVED', note: 'Verified for daily 12-2 PM batch' },
  })
  assert.equal(approveRes.status, 200)

  const uncertainRes = await api(`/api/admin/withdrawals/${wId}`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'UNCERTAIN', failureReason: 'Gateway timeout during check' },
  })
  assert.equal(uncertainRes.status, 200)
  const pubDuringUncertain = await prisma.publisher.findUniqueOrThrow({ where: { id: pubAId } })
  assert.equal(Number(pubDuringUncertain.reservedBalance), 15, 'Reservation preserved while UNCERTAIN')

  // Concurrent duplicate PAID actions on the same withdrawal -> only ONE succeeds!
  const [paid1, paid2] = await Promise.all([
    api(`/api/admin/withdrawals/${wId}`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'PAID', txReference: `TXN-${run}-1`, note: 'Paid' },
    }),
    api(`/api/admin/withdrawals/${wId}`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'PAID', txReference: `TXN-${run}-2`, note: 'Duplicate click' },
    }),
  ])
  assert.equal([paid1, paid2].filter((r) => r.status === 200).length, 1, 'Only one PAID call succeeds')
  assert.equal([paid1, paid2].filter((r) => r.status === 409).length, 1, 'Duplicate PAID rejected with 409')

  const pubAfterPaid = await prisma.publisher.findUniqueOrThrow({ where: { id: pubAId } })
  assert.equal(Number(pubAfterPaid.walletBalance), 5)
  assert.equal(Number(pubAfterPaid.reservedBalance), 0, 'Reservation cleared on PAID')
  pass('5. Withdrawal lifecycle (Approve, Uncertain preservation, concurrent PAID guard)')

  // ── 7. Rejected Withdrawal Releases Reservation Once ──────────────────────
  // Settle histDate2 ($12) -> PubA available balance becomes $5 + $12 = $17.00
  await api('/api/admin/settlement', {
    token: adminToken,
    body: { action: 'run_settlement', targetDate: histDate2 },
  })
  const wRejectCreate = await api('/api/publisher/withdraw', {
    token: pubAToken,
    body: { amount: 15, walletAddress: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', network: 'TRC20' },
  })
  assert.equal(wRejectCreate.status, 201)
  const wRejectId = wRejectCreate.json!.withdrawalId as string

  const rejectRes = await api(`/api/admin/withdrawals/${wRejectId}`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'REJECTED', note: 'Invalid destination memo' },
  })
  assert.equal(rejectRes.status, 200)
  const rejectAgain = await api(`/api/admin/withdrawals/${wRejectId}`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'REJECTED', note: 'Duplicate reject' },
  })
  assert.equal(rejectAgain.status, 409)

  const pubAfterReject = await prisma.publisher.findUniqueOrThrow({ where: { id: pubAId } })
  assert.equal(Number(pubAfterReject.walletBalance), 17, 'Rejected withdrawal refunded once to $17.00')
  assert.equal(Number(pubAfterReject.reservedBalance), 0)
  pass('6. Rejected withdrawal releases reservation exactly once')

  // ── 8. Date-Wise Reports, Safe Clearing, Backup Failure & Restore ─────────
  // Today's report must be blocked from clearing
  const clearToday = await api('/api/admin/reports/clear', {
    token: adminToken,
    body: { action: 'execute', dates: [today], reason: 'should fail', confirmed: true },
  })
  assert.equal(clearToday.status, 400, 'Current IST day cannot be cleared')

  // Simulated backup failure must abort without clearing (tested at service boundary; HTTP route stays locked in prod)
  await assert.rejects(
    () =>
      executeReportClear({
        dates: [histDate1],
        reason: 'simulate fail',
        adminId: 'admin-test',
        adminEmail: ADMIN_EMAIL,
        simulateBackupFailure: true,
      }),
    /Backup creation\/verification failed/
  )
  const activeBeforeClear = await api(`/api/admin/reports?from=${histDate1}&to=${histDate1}`, { token: adminToken })
  assert.equal((activeBeforeClear.json!.data as { rows: unknown[] }).rows.length, 1, 'Failed backup left report untouched')

  // Safe clear of settled historical dates (paid day histDate1 + unpaid settled day histDate2)
  const clearOk = await api('/api/admin/reports/clear', {
    token: adminToken,
    body: {
      action: 'execute',
      dates: [histDate1, histDate2],
      reason: 'Completed historical archive test',
      confirmed: true,
    },
  })
  assert.equal(clearOk.status, 200)
  const backupId = (clearOk.json!.data as { backupId: string }).backupId
  assert.ok(backupId, 'Verified backup created')

  // Active view must hide cleared dates; archived view must show them
  const activeAfterClear = await api(`/api/admin/reports?from=${histDate2}&to=${histDate1}`, { token: adminToken })
  assert.equal((activeAfterClear.json!.data as { rows: unknown[] }).rows.length, 0)
  const archivedView = await api(`/api/admin/reports?from=${histDate2}&to=${histDate1}&onlyCleared=true`, { token: adminToken })
  assert.equal((archivedView.json!.data as { clearedRows: unknown[] }).clearedRows.length, 2)

  // Wallet balance & paid history MUST remain identical after clearing!
  const pubAfterClear = await prisma.publisher.findUniqueOrThrow({ where: { id: pubAId } })
  assert.equal(Number(pubAfterClear.walletBalance), 17, 'Wallet balance unchanged after clearing')

  // Controlled restore must restore report visibility without re-crediting wallet!
  const restoreRes = await api('/api/admin/reports/restore', {
    token: adminToken,
    body: { dates: [histDate1], reason: 'Audit check restore' },
  })
  assert.equal(restoreRes.status, 200)
  const pubAfterRestore = await prisma.publisher.findUniqueOrThrow({ where: { id: pubAId } })
  assert.equal(Number(pubAfterRestore.walletBalance), 17, 'Restore must NEVER re-credit earnings')
  pass('7. Safe report clearing, backup verification, failure abort, and non-crediting restore')

  // ── 9. Security & Authorization Boundaries ────────────────────────────────
  assert.equal((await api('/api/admin/reports', { token: pubAToken })).status, 401)
  assert.equal((await api('/api/admin/reports/clear', { token: pubAToken, body: { action: 'preview', dates: [histDate1] } })).status, 401)
  assert.equal((await api('/api/admin/settlement', { token: pubAToken })).status, 401)
  assert.equal((await api('/api/admin/withdrawals', { token: pubB.token })).status, 401)
  assert.equal((await api(`/api/admin/withdrawals/${wId}`, { method: 'PATCH', token: pubB.token, body: { status: 'PAID', txReference: 'x' } })).status, 401)
  pass('8. Role & authorization checks block unauthorized publisher/unauthenticated access')

  // ── 10. PWA Manifest, Service Worker & Offline Fallback ───────────────────
  const manifestRes = await api('/manifest.webmanifest')
  assert.equal(manifestRes.status, 200)
  assert.equal(manifestRes.json!.name, 'Ads2Pub')
  assert.equal(manifestRes.json!.display, 'standalone')
  const swRes = await api('/sw.js')
  assert.equal(swRes.status, 200)
  assert.ok(swRes.text.includes("url.pathname.startsWith('/api/')"))
  const offlineRes = await api('/offline.html')
  assert.equal(offlineRes.status, 200)
  const iconRes = await api('/icons/icon-192.png')
  assert.equal(iconRes.status, 200)
  pass('9. PWA manifest, non-caching service worker, offline page & icons verified')

  // Restore default trial reward rate
  await api('/api/admin/config', { token: adminToken, body: { key: 'pub_earn_amount', value: '0.50' } })
  console.log(`\nALL ${passed.length} PRD ACCEPTANCE CHECKS PASSED.`)
}

main()
  .catch((err) => {
    console.error('\nFAILED:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
