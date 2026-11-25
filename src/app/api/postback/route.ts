import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { postbackBodySchema, type PostbackBody } from '@/lib/validators'
import { maskSecret, recordConversionEvent, type ConversionEventInput } from '@/lib/postbackLog'
import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// These defaults are published in this repository, so they authenticate
// nothing. Accepted only outside production while no secret is configured.
const PUBLIC_DEFAULT_SECRETS = ['your-postback-secret-key-for-dev', 'pw_secret_changeme']

// Values a sender may put in `status` for a completed registration. A missing
// status counts as success: the callback is only meant to fire after one.
const SUCCESS_STATUSES = new Set([
  'success', 'successful', 'completed', 'complete', 'registered',
  'approved', 'confirmed', 'ok', '1', 'true',
])

type Meta = Pick<ConversionEventInput, 'source' | 'secretHint' | 'ip'>

type Outcome = Omit<ConversionEventInput, keyof Meta> & {
  credited?: number
  // Credited outcomes are audited inside their transaction.
  logged?: boolean
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

async function secretIsValid(provided: string): Promise<boolean> {
  const isProd = process.env.NODE_ENV === 'production'
  const row = await prisma.globalConfig.findUnique({ where: { key: 'postback_secret' } })
  // Trim: a secret pasted into Admin → Settings with a trailing space or
  // newline is invisible in the UI but would reject every postback.
  const expected = row?.value.trim()

  if (!expected) return !isProd && PUBLIC_DEFAULT_SECRETS.includes(provided)
  if (isProd && PUBLIC_DEFAULT_SECRETS.includes(expected)) {
    console.error('[postback] postback_secret is a public default — set a new one in Admin → Settings')
    return false
  }
  return safeEqual(provided, expected)
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

async function processPostback(p: PostbackBody, meta: Meta): Promise<Outcome> {
  const base = { code: p.code, externalUserId: p.uid, clickId: p.click_id ?? null, linkType: p.type ?? null }

  if (!(await secretIsValid(p.secret.trim()))) {
    return { ...base, outcome: 'REJECTED', reason: 'Invalid secret', secretMatched: false }
  }
  const ok = { ...base, secretMatched: true }

  if (p.status && !SUCCESS_STATUSES.has(p.status.toLowerCase())) {
    return { ...ok, outcome: 'REJECTED', reason: `registration not successful (status=${p.status})` }
  }

  const type = p.type ?? (await resolveLinkType(p.code))
  if (!type) return { ...ok, outcome: 'REJECTED', reason: 'link not found' }

  return type === 'publisher'
    ? creditPublisher(p, { ...ok, linkType: type }, meta)
    : creditTraffic(p, { ...ok, linkType: type }, meta)
}

async function creditPublisher(
  p: PostbackBody,
  ok: Omit<Outcome, 'outcome' | 'reason'>,
  meta: Meta
): Promise<Outcome> {
  const link = await prisma.trackingLink.findUnique({ where: { uniqueCode: p.code } })
  if (!link) return { ...ok, outcome: 'REJECTED', reason: 'link not found' }

  const attributed = { ...ok, publisherId: link.publisherId, trackingLinkId: link.id }

  // click_id is optional, but when sent it must belong to the same link —
  // a mismatch means the attribution data is inconsistent, so we refuse to
  // guess and leave it for admin review.
  let clickId: string | null = null
  if (p.click_id) {
    const click = await prisma.click.findUnique({
      where: { id: p.click_id },
      select: { trackingLinkId: true },
    })
    if (click && click.trackingLinkId !== link.id) {
      return { ...attributed, outcome: 'REJECTED', reason: 'click_id belongs to a different link' }
    }
    if (click) clickId = p.click_id
  }

  const existing = await prisma.conversion.findUnique({
    where: { externalUserId: p.uid },
    select: { id: true },
  })
  if (existing) {
    return { ...attributed, outcome: 'DUPLICATE', reason: 'duplicate', conversionId: existing.id }
  }

  const earnConfig = await prisma.globalConfig.findUnique({ where: { key: 'pub_earn_amount' } })
  const earnAmount = parseFloat(earnConfig?.value ?? '0.05')
  const reason = p.click_id && !clickId ? 'credited (click_id not found)' : 'credited'

  try {
    const conversion = await prisma.$transaction(async (tx) => {
      const created = await tx.conversion.create({
        data: {
          publisherId: link.publisherId,
          trackingLinkId: link.id,
          clickId,
          externalUserId: p.uid,
          amount: earnAmount,
          status: 'CONFIRMED',
          isValid: true,
        },
      })
      const pub = await tx.publisher.findUniqueOrThrow({
        where: { id: link.publisherId },
        select: { walletBalance: true, reservedBalance: true },
      })
      // Next-day settlement: today's valid earnings accrue in Today's Earnings and
      // are settled into available walletBalance on the following IST calendar day.
      await tx.ledgerTransaction.create({
        data: {
          accountType: 'PUBLISHER',
          accountId: link.publisherId,
          entryType: 'EARNING_ACCRUED',
          direction: 'MEMO',
          amount: created.amount,
          balanceAfter: pub.walletBalance,
          reservedAfter: pub.reservedBalance,
          referenceType: 'CONVERSION',
          referenceId: created.id,
          idempotencyKey: `accrual:CONVERSION:${created.id}`,
          note: 'Validated conversion accrued (eligible for next-day IST settlement)',
        },
      })
      await tx.conversionEvent.create({
        data: { ...meta, ...attributed, outcome: 'CREDITED', reason, conversionId: created.id },
      })
      return created
    })
    return {
      ...attributed,
      outcome: 'CREDITED',
      reason,
      conversionId: conversion.id,
      credited: earnAmount,
      logged: true,
    }
  } catch (error) {
    // A concurrent retry of the same registration won the race.
    if (isUniqueViolation(error)) return { ...attributed, outcome: 'DUPLICATE', reason: 'duplicate' }
    throw error
  }
}

async function creditTraffic(
  p: PostbackBody,
  ok: Omit<Outcome, 'outcome' | 'reason'>,
  meta: Meta
): Promise<Outcome> {
  const trafficLink = await prisma.trafficLink.findUnique({ where: { uniqueCode: p.code } })
  if (!trafficLink) return { ...ok, outcome: 'REJECTED', reason: 'link not found' }
  if (!trafficLink.isActive) return { ...ok, outcome: 'REJECTED', reason: 'link is inactive' }

  const existing = await prisma.trafficEarning.findUnique({
    where: {
      trafficLinkId_externalUserId: { trafficLinkId: trafficLink.id, externalUserId: p.uid },
    },
    select: { id: true },
  })
  if (existing) return { ...ok, outcome: 'DUPLICATE', reason: 'duplicate' }

  const earnConfig = await prisma.globalConfig.findUnique({ where: { key: 'traffic_earn_amount' } })
  const earnAmount = parseFloat(earnConfig?.value ?? '3.00')

  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.trafficEarning.create({
        data: {
          userId: trafficLink.userId,
          trafficLinkId: trafficLink.id,
          externalUserId: p.uid,
          amount: earnAmount,
          isValid: true,
        },
      })
      const user = await tx.trafficUser.findUniqueOrThrow({
        where: { id: trafficLink.userId },
        select: { walletBalance: true, reservedBalance: true },
      })
      await tx.trafficLink.update({
        where: { id: trafficLink.id },
        data: { conversions: { increment: 1 } },
      })
      // Next-day settlement: accrued today, settled into available walletBalance next IST day.
      await tx.ledgerTransaction.create({
        data: {
          accountType: 'TRAFFIC',
          accountId: trafficLink.userId,
          entryType: 'EARNING_ACCRUED',
          direction: 'MEMO',
          amount: created.amount,
          balanceAfter: user.walletBalance,
          reservedAfter: user.reservedBalance,
          referenceType: 'TRAFFIC_EARNING',
          referenceId: created.id,
          idempotencyKey: `accrual:TRAFFIC_EARNING:${created.id}`,
          note: 'Validated traffic earning accrued (eligible for next-day IST settlement)',
        },
      })
      await tx.conversionEvent.create({
        data: { ...meta, ...ok, outcome: 'CREDITED', reason: 'credited' },
      })
    })
    return { ...ok, outcome: 'CREDITED', reason: 'credited', credited: earnAmount, logged: true }
  } catch (error) {
    if (isUniqueViolation(error)) return { ...ok, outcome: 'DUPLICATE', reason: 'duplicate' }
    throw error
  }
}

async function resolveLinkType(code: string): Promise<'publisher' | 'traffic' | null> {
  const [trackingLink, trafficLink] = await Promise.all([
    prisma.trackingLink.findUnique({ where: { uniqueCode: code }, select: { id: true } }),
    prisma.trafficLink.findUnique({ where: { uniqueCode: code }, select: { id: true } }),
  ])

  if (trackingLink) return 'publisher'
  if (trafficLink) return 'traffic'
  return null
}

function readParam(payload: unknown, key: string): string | null {
  if (payload && typeof payload === 'object') {
    const value = (payload as Record<string, unknown>)[key]
    if (typeof value === 'string' && value) return value.slice(0, 191)
  }
  return null
}

function callerIp(request: NextRequest): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    null
  )
}

async function handlePostback(payload: unknown, source: 'GET' | 'POST', request: NextRequest) {
  const ip = callerIp(request)
  const parsed = postbackBodySchema.safeParse(payload)

  if (!parsed.success) {
    const reason = parsed.error.issues[0].message
    console.warn('[postback rejected]', reason)
    await recordConversionEvent({
      source,
      ip,
      outcome: 'REJECTED',
      reason,
      code: readParam(payload, 'code'),
      externalUserId: readParam(payload, 'uid'),
      clickId: readParam(payload, 'click_id'),
      linkType: readParam(payload, 'type'),
      secretMatched: false,
      secretHint: maskSecret(readParam(payload, 'secret')),
    })
    // 200 for logical rejections so senders do not retry them forever.
    return NextResponse.json({ success: false, reason }, { status: 200 })
  }

  const meta: Meta = { source, ip, secretHint: maskSecret(parsed.data.secret) }
  const { credited, logged, ...event } = await processPostback(parsed.data, meta)

  if (!logged) await recordConversionEvent({ ...meta, ...event })
  if (event.outcome !== 'CREDITED') {
    console.warn('[postback not credited]', event.reason, { code: event.code, uid: event.externalUserId })
  }

  return NextResponse.json(
    event.outcome === 'CREDITED'
      ? { success: true, credited }
      : { success: false, reason: event.reason },
    { status: 200 }
  )
}

// Internal failures return 500 on purpose: the sender should retry, and
// retries are safe because a registration can only be credited once.
function internalError(error: unknown) {
  console.error('[postback API error]', error)
  return NextResponse.json({ success: false, reason: 'Internal server error' }, { status: 500 })
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown = {}
    try {
      body = await request.clone().json()
    } catch {
      // Some panels post form-encoded bodies instead of JSON
      try {
        const form = await request.formData()
        body = Object.fromEntries(form.entries())
      } catch {
        body = {}
      }
    }

    return await handlePostback(body, 'POST', request)
  } catch (error) {
    return internalError(error)
  }
}

// Many external panels fire postbacks as a GET pixel/URL instead of a JSON POST.
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const pick = (...keys: string[]) => {
      for (const key of keys) {
        const value = params.get(key)
        if (value) return value
      }
      return undefined
    }

    const payload = {
      code: pick('code', 'ref', 'ref_code', 'subid', 'sub_id'),
      uid: pick('uid', 'user_id', 'userid', 'external_user_id'),
      type: pick('type'),
      secret: pick('secret', 'key'),
      click_id: pick('click_id', 'clickid'),
      status: pick('status'),
    }

    return await handlePostback(payload, 'GET', request)
  } catch (error) {
    return internalError(error)
  }
}
