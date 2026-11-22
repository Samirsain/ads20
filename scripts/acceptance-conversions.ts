/**
 * End-to-end acceptance check for admin-only conversion tracking (PRD §7).
 *
 * Talks to a running server over HTTP only. It registers publishers, creates
 * links, sets the postback secret and fires postbacks — so the server must be
 * backed by a DISPOSABLE database. Refuses non-localhost URLs.
 *
 *   BASE_URL=http://localhost:3000 npm run test:conversions
 */
import assert from 'node:assert/strict'
import { addDays, dayRange, startOfDay } from '../src/lib/appTime'

const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  throw new Error(`Refusing to run against ${BASE}: this test writes data. Use a local server.`)
}
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@ads2pub.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123'

const run = Date.now().toString(36)
const SECRET = `acceptance-${run}-secret`
let ipCounter = 0
const results: string[] = []

function pass(name: string) {
  results.push(`PASS  ${name}`)
  console.log(`PASS  ${name}`)
}

type Res = { status: number; json: any; headers: Headers }

async function api(
  path: string,
  opts: { method?: string; body?: unknown; token?: string; cookie?: string } = {}
): Promise<Res> {
  ipCounter++
  const res = await fetch(BASE + path, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    redirect: 'manual',
    headers: {
      ...(opts.body !== undefined && { 'content-type': 'application/json' }),
      ...(opts.token && { authorization: `Bearer ${opts.token}` }),
      ...(opts.cookie && { cookie: opts.cookie }),
      // Distinct IPs keep the in-memory redirect rate limiter out of the way.
      'x-forwarded-for': `10.77.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`,
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  const text = await res.text()
  let json: any = null
  try {
    json = JSON.parse(text)
  } catch {
    // non-JSON (redirects, HTML)
  }
  return { status: res.status, json, headers: res.headers }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function waitFor(check: () => Promise<boolean>, what: string) {
  for (let i = 0; i < 50; i++) {
    if (await check()) return
    await sleep(100)
  }
  throw new Error(`Timed out waiting for ${what}`)
}

/** Every key path and value in a JSON tree. */
function walk(value: unknown, path = '$', out: { path: string; value: unknown }[] = []) {
  out.push({ path, value })
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`, out)
  }
  return out
}

function assertNoConversionData(json: unknown, uids: string[], label: string) {
  for (const { path, value } of walk(json)) {
    const key = path.split('.').pop() ?? ''
    assert.ok(
      !/conver|lead|externalUserId|registration|clickId/i.test(key),
      `${label}: publisher response exposes "${path}"`
    )
    if (typeof value === 'string') {
      assert.ok(!uids.includes(value), `${label}: publisher response contains registration ref at ${path}`)
    }
  }
}

function unitChecks() {
  assert.equal(startOfDay('2026-11-22', 'Asia/Kolkata').toISOString(), '2026-11-21T18:30:00.000Z')
  assert.equal(startOfDay('2026-03-08', 'America/New_York').toISOString(), '2026-03-08T05:00:00.000Z')
  assert.equal(startOfDay('2026-11-01', 'America/New_York').toISOString(), '2026-11-01T04:00:00.000Z')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.deepEqual(dayRange('2026-11-22', '2026-11-22', 'UTC'), {
    gte: new Date('2026-11-22T00:00:00.000Z'),
    lt: new Date('2026-11-23T00:00:00.000Z'),
  })
  assert.equal(dayRange('not-a-date', null), undefined)
  pass('timezone day boundaries (IST, DST, ranges)')
}

async function main() {
  unitChecks()

  // ── Setup ────────────────────────────────────────────────────────────────
  const adminLogin = await api('/api/auth/admin/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })
  assert.equal(adminLogin.status, 200, 'admin login (seed the database first)')
  const admin = adminLogin.json.data.token as string

  const setSecret = await api('/api/admin/config', { token: admin, body: { key: 'postback_secret', value: SECRET } })
  assert.equal(setSecret.status, 200)
  const config = await api('/api/admin/config', { token: admin })
  const earn = parseFloat(config.json.data.pub_earn_amount ?? '0.05')

  async function register(tag: string) {
    const r = await api('/api/auth/publisher/register', {
      body: { email: `${tag}-${run}@acceptance.test`, password: 'acceptance-pass', name: `Publisher ${tag} ${run}` },
    })
    assert.equal(r.status, 201, `register publisher ${tag}`)
    return { id: r.json.data.publisher.id as string, token: r.json.data.token as string }
  }
  const A = await register('a')
  const B = await register('b')

  async function createLink(pub: { token: string }) {
    const r = await api('/api/publisher/links', { token: pub.token, body: { linkType: 'direct' } })
    assert.equal(r.status, 201, 'create link')
    return { id: r.json.data.id as string, code: r.json.data.uniqueCode as string }
  }
  const link1 = await createLink(A)
  const link2 = await createLink(A)
  const link3 = await createLink(B)
  pass('link creation still works')

  async function click(link: { code: string }) {
    const r = await api(`/t/${link.code}`)
    assert.equal(r.status, 302, 'redirect')
    const location = new URL(r.headers.get('location')!)
    assert.equal(location.searchParams.get('ref'), link.code, 'ref preserved on redirect')
    const clickId = location.searchParams.get('click_id')
    assert.ok(clickId, 'click_id appended on redirect')
    return clickId!
  }
  const click1 = await click(link1)
  const click2 = await click(link2)
  const click3 = await click(link3)
  pass('redirect preserves ref and adds click_id')

  // Click rows are written after the redirect is sent.
  await waitFor(async () => {
    const r = await api('/api/publisher/links', { token: A.token })
    return r.json.data.every((l: any) => l.clicks === 1)
  }, 'click counters')

  const postback = (body: Record<string, string>) => api('/api/postback', { body: { secret: SECRET, ...body } })
  const conversionsFor = async (query: string) => {
    const r = await api(`/api/admin/conversions?${query}`, { token: admin })
    assert.equal(r.status, 200)
    return r.json.data
  }

  const uid = (n: string) => `pw-${run}-${n}`

  // ── 1. Successful registration via Link 1 counts once under Link 1 ──────
  const t1 = await postback({ code: link1.code, uid: uid('a1'), click_id: click1 })
  assert.deepEqual(t1.json, { success: true, credited: earn })
  let d = await conversionsFor(`linkId=${link1.id}`)
  assert.equal(d.summary.matching, 1)
  assert.equal(d.conversions[0].externalUserId, uid('a1'))
  assert.equal(d.conversions[0].clickId, click1)
  assert.equal(d.conversions[0].publisher.id, A.id)
  pass('1. registration via Link 1 → exactly one conversion on Link 1 (with click ID)')

  // ── 2. Retries are not counted again ─────────────────────────────────────
  const retryPost = await postback({ code: link1.code, uid: uid('a1'), click_id: click1 })
  const retryGet = await api(
    `/api/postback?ref=${link1.code}&uid=${uid('a1')}&click_id=${click1}&secret=${encodeURIComponent(SECRET)}`
  )
  assert.deepEqual(retryPost.json, { success: false, reason: 'duplicate' })
  assert.deepEqual(retryGet.json, { success: false, reason: 'duplicate' })
  // Same registration arriving via another publisher's link is still one registration.
  const crossPub = await postback({ code: link3.code, uid: uid('a1') })
  assert.deepEqual(crossPub.json, { success: false, reason: 'duplicate' })
  // Concurrent retries: exactly one wins.
  const burst = await Promise.all(
    Array.from({ length: 6 }, () => postback({ code: link3.code, uid: uid('b2'), click_id: click3 }))
  )
  assert.equal(burst.filter((r) => r.json?.success).length, 1, 'exactly one concurrent callback credited')
  assert.ok(burst.every((r) => r.status === 200), 'concurrent duplicates answered 200, not 500')
  d = await conversionsFor(`linkId=${link1.id}`)
  assert.equal(d.summary.matching, 1)
  pass('2. retried callbacks (POST, GET, cross-publisher, 6 concurrent) are not double counted')

  // ── 3. Link 2 is attributed to Link 2, not Link 1 ────────────────────────
  await postback({ code: link2.code, uid: uid('a2'), click_id: click2 })
  assert.equal((await conversionsFor(`linkId=${link2.id}`)).summary.matching, 1)
  assert.equal((await conversionsFor(`linkId=${link1.id}`)).summary.matching, 1)
  pass('3. registration via Link 2 appears under Link 2 only')

  // ── 4. Publisher B's link is attributed to Publisher B ───────────────────
  await postback({ code: link3.code, uid: uid('b1'), click_id: click3 })
  const dA = await conversionsFor(`publisherId=${A.id}`)
  const dB = await conversionsFor(`publisherId=${B.id}`)
  assert.equal(dA.summary.matching, 2)
  assert.equal(dB.summary.matching, 2) // b1 + b2 from the concurrency test
  assert.ok(dB.conversions.every((c: any) => c.publisher.id === B.id))
  assert.deepEqual(
    dA.byLink.map((l: any) => [l.linkId, l.conversions]).sort(),
    [[link1.id, 1], [link2.id, 1]].sort()
  )
  pass('4. Publisher B registrations appear under Publisher B, per-link totals correct')

  // ── 5. Failed / invalid callbacks never count ────────────────────────────
  const failed = await postback({ code: link1.code, uid: uid('fail'), status: 'failed' })
  const badSecret = await api('/api/postback', { body: { code: link1.code, uid: uid('bad'), secret: 'wrong' } })
  const unknown = await postback({ code: 'nope-' + run, uid: uid('unknown') })
  const mismatch = await postback({ code: link1.code, uid: uid('mismatch'), click_id: click3 })
  assert.equal(failed.json.success, false)
  assert.match(failed.json.reason, /not successful/)
  assert.equal(badSecret.json.reason, 'Invalid secret')
  assert.equal(unknown.json.reason, 'link not found')
  assert.equal(mismatch.json.reason, 'click_id belongs to a different link')
  assert.equal((await conversionsFor(`publisherId=${A.id}`)).summary.matching, 2)
  const review = await api('/api/admin/postback-log?outcome=REJECTED&limit=100', { token: admin })
  const reviewUids = review.json.data.map((e: any) => e.uid)
  for (const n of ['fail', 'bad', 'unknown', 'mismatch']) assert.ok(reviewUids.includes(uid(n)), `review queue has ${n}`)
  pass('5. failed status, bad secret, unknown link, click mismatch → not counted, logged for review')

  // ── 6. Publisher stats keep working, maths unchanged ─────────────────────
  const dash = await api('/api/publisher/dashboard', { token: A.token })
  const earnings = await api('/api/publisher/earnings', { token: A.token })
  const links = await api('/api/publisher/links', { token: A.token })
  assert.equal(Number(dash.json.data.walletBalance), +(2 * earn).toFixed(2))
  assert.equal(dash.json.data.totalImpressions, 2)
  assert.equal(dash.json.data.currentCpm, 20) // clamp(2 conv / 2 imp × 100) = 20
  assert.equal(dash.json.data.todayEarnings, +(2 * earn).toFixed(2))
  assert.equal(earnings.json.data.totalImpressions, 2)
  assert.equal(earnings.json.data.totalEarnings, +(2 * earn).toFixed(2))
  for (const l of links.json.data) {
    assert.equal(l.clicks, 1)
    assert.equal(l.cpmRate, 20)
    assert.equal(l.earnings, 0.02) // (1 / 1000) × 20
  }
  pass('6. publisher CPM, impressions, clicks, earnings, wallet — same values as the original formulas')

  // ── 7. Publisher surfaces expose no conversion data ──────────────────────
  const allUids = ['a1', 'a2', 'b1', 'b2'].map(uid)
  for (const [label, r] of [['dashboard', dash], ['earnings', earnings], ['links', links]] as const) {
    assertNoConversionData(r.json, allUids, label)
  }
  for (const pub of [A, B]) {
    const w = await api('/api/publisher/withdraw', { token: pub.token })
    assertNoConversionData(w.json, allUids, 'withdraw')
  }
  assert.equal((await api('/api/publisher/conversions', { token: A.token })).status, 404)
  assert.equal((await api('/publisher/conversions', { cookie: `pub_token=${A.token}` })).status, 404)
  assert.equal((await api('/api/admin/conversions', { token: A.token })).status, 401)
  assert.equal((await api('/api/admin/postback-log', { token: A.token })).status, 401)
  assert.equal((await api('/api/admin/conversions')).status, 401)
  pass('7. publisher APIs/pages expose no conversion data; admin APIs reject publisher tokens')

  // ── 8. Admin filters: publisher, link, date, search ──────────────────────
  const today = (await conversionsFor('')).today as string
  assert.equal((await conversionsFor(`publisherId=${A.id}&from=${today}&to=${today}`)).summary.matching, 2)
  assert.equal((await conversionsFor(`publisherId=${A.id}&from=${addDays(today, 1)}`)).summary.matching, 0)
  assert.equal((await conversionsFor(`publisherId=${A.id}&to=${addDays(today, -1)}`)).summary.matching, 0)
  assert.equal((await conversionsFor(`q=${uid('b1')}`)).summary.matching, 1)
  assert.equal((await conversionsFor(`q=${link2.code}`)).summary.matching, 1)
  assert.equal((await conversionsFor(`q=${encodeURIComponent(`Publisher b ${run}`)}`)).summary.matching, 2)
  const withLink = await conversionsFor(`publisherId=${A.id}&linkId=${link1.id}`)
  assert.equal(withLink.summary.matching, 1)
  assert.equal(withLink.selected.publisher.id, A.id)
  assert.equal(withLink.selected.link.id, link1.id)
  pass('8. admin filters by publisher, link, date range and search')

  // ── 9. Redirect / link creation still fine after all of the above ───────
  const another = await createLink(B)
  await click(another)
  pass('9. link creation and redirect keep working')

  console.log(`\n${results.length} checks passed.`)
}

main().catch((error) => {
  console.error('\nFAIL', error instanceof Error ? error.message : error)
  process.exit(1)
})
