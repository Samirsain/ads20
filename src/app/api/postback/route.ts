import { prisma } from '@/lib/prisma'
import { postbackBodySchema } from '@/lib/validators'
import { maskSecret, recordPostbackAttempt } from '@/lib/postbackLog'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

type PostbackPayload = {
  code: string
  uid: string
  type?: 'publisher' | 'traffic'
  secret: string
}

type PostbackResult = {
  success: boolean
  credited?: number
  reason?: string
  error?: string
}

// Used only until an admin stores a `postback_secret` in GlobalConfig. Both
// values are accepted while unset so a sender configured with either of the
// historic defaults still gets its conversions credited.
const FALLBACK_POSTBACK_SECRETS = ['your-postback-secret-key-for-dev', 'pw_secret_changeme']

async function processPostback(payload: PostbackPayload): Promise<PostbackResult> {
  const { code, uid, secret } = payload

  // 1. Fetch postback_secret from database config
  const secretConfig = await prisma.globalConfig.findUnique({
    where: { key: 'postback_secret' },
  })
  // Trim both sides: a secret pasted into Admin → Settings with a trailing
  // space or newline is invisible in the UI but would reject every postback.
  const providedSecret = secret.trim()
  const secretIsValid = secretConfig
    ? providedSecret === secretConfig.value.trim()
    : FALLBACK_POSTBACK_SECRETS.includes(providedSecret)

  if (!secretIsValid) {
    return { success: false, error: 'Invalid secret' }
  }

  // 2. Resolve the link type. Senders that omit `type` are matched by code.
  const type = payload.type ?? (await resolveLinkType(code))

  if (!type) {
    return { success: false, reason: 'link not found' }
  }

  if (type === 'publisher') {
    // 3. Find TrackingLink by uniqueCode
    const trackingLink = await prisma.trackingLink.findUnique({
      where: { uniqueCode: code },
    })

    if (!trackingLink) {
      return { success: false, reason: 'link not found' }
    }

    // 3. Check duplicate conversion
    const existingConversion = await prisma.conversion.findUnique({
      where: {
        publisherId_externalUserId: {
          publisherId: trackingLink.publisherId,
          externalUserId: uid,
        },
      },
    })

    if (existingConversion) {
      return { success: false, reason: 'duplicate' }
    }

    // 4. Fetch reward amount
    const earnConfig = await prisma.globalConfig.findUnique({
      where: { key: 'pub_earn_amount' },
    })
    const earnAmount = parseFloat(earnConfig?.value ?? '0.05')

    // 5. Atomic transaction
    await prisma.$transaction([
      prisma.conversion.create({
        data: {
          publisherId: trackingLink.publisherId,
          trackingLinkId: trackingLink.id,
          externalUserId: uid,
          amount: earnAmount,
          status: 'CONFIRMED',
        },
      }),
      prisma.publisher.update({
        where: { id: trackingLink.publisherId },
        data: { walletBalance: { increment: earnAmount } },
      }),
    ])

    return { success: true, credited: earnAmount }
  }

  // type === 'traffic'
  // 3. Find TrafficLink by uniqueCode
  const trafficLink = await prisma.trafficLink.findUnique({
    where: { uniqueCode: code },
  })

  if (!trafficLink) {
    return { success: false, reason: 'link not found' }
  }

  if (!trafficLink.isActive) {
    return { success: false, reason: 'link is inactive' }
  }

  // 3. Check duplicate traffic earning
  const existingEarning = await prisma.trafficEarning.findUnique({
    where: {
      trafficLinkId_externalUserId: {
        trafficLinkId: trafficLink.id,
        externalUserId: uid,
      },
    },
  })

  if (existingEarning) {
    return { success: false, reason: 'duplicate' }
  }

  // 4. Fetch reward amount
  const earnConfig = await prisma.globalConfig.findUnique({
    where: { key: 'traffic_earn_amount' },
  })
  const earnAmount = parseFloat(earnConfig?.value ?? '3.00')

  // 5. Atomic transaction
  await prisma.$transaction([
    prisma.trafficEarning.create({
      data: {
        userId: trafficLink.userId,
        trafficLinkId: trafficLink.id,
        externalUserId: uid,
        amount: earnAmount,
      },
    }),
    prisma.trafficUser.update({
      where: { id: trafficLink.userId },
      data: { walletBalance: { increment: earnAmount } },
    }),
    prisma.trafficLink.update({
      where: { id: trafficLink.id },
      data: { conversions: { increment: 1 } },
    }),
  ])

  return { success: true, credited: earnAmount }
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
    if (typeof value === 'string' && value) return value
  }
  return null
}

async function handlePostback(payload: unknown, source: 'GET' | 'POST') {
  const result = postbackBodySchema.safeParse(payload)

  if (!result.success) {
    const error = result.error.issues[0].message
    console.warn('[postback rejected]', error, payload)
    await recordPostbackAttempt({
      at: new Date().toISOString(),
      source,
      code: readParam(payload, 'code'),
      uid: readParam(payload, 'uid'),
      type: readParam(payload, 'type'),
      secretMatched: false,
      secretHint: maskSecret(readParam(payload, 'secret')),
      result: error,
    })
    return NextResponse.json(
      { success: false, error },
      { status: 200 } // Return 200 as specified, but with success: false
    )
  }

  const outcome = await processPostback(result.data)

  if (!outcome.success) {
    // Surface why a conversion was not counted — the most common support question
    console.warn('[postback not credited]', outcome.reason ?? outcome.error, {
      code: result.data.code,
      uid: result.data.uid,
      type: result.data.type ?? 'auto',
    })
  }

  await recordPostbackAttempt({
    at: new Date().toISOString(),
    source,
    code: result.data.code,
    uid: result.data.uid,
    type: result.data.type ?? 'auto',
    secretMatched: outcome.error !== 'Invalid secret',
    secretHint: maskSecret(result.data.secret),
    result: outcome.success
      ? `credited $${outcome.credited}`
      : outcome.reason ?? outcome.error ?? 'rejected',
  })

  return NextResponse.json(outcome, { status: 200 })
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown = {}
    try {
      body = await request.json()
    } catch {
      // Some panels post form-encoded bodies instead of JSON
      try {
        const form = await request.formData()
        body = Object.fromEntries(form.entries())
      } catch {
        body = {}
      }
    }

    return await handlePostback(body, 'POST')
  } catch (error) {
    console.error('[postback API catch-all error]', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 200 }
    )
  }
}

// Many external panels fire postbacks as a GET pixel/URL instead of a JSON POST.
// Without this handler those requests got a 405 and no conversion was ever recorded.
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
    }

    return await handlePostback(payload, 'GET')
  } catch (error) {
    console.error('[postback API catch-all error]', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 200 }
    )
  }
}
