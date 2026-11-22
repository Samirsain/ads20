import { prisma } from '@/lib/prisma'

export type ConversionOutcome = 'CREDITED' | 'DUPLICATE' | 'REJECTED'

export type ConversionEventInput = {
  source: 'GET' | 'POST'
  outcome: ConversionOutcome
  reason: string
  code?: string | null
  externalUserId?: string | null
  clickId?: string | null
  linkType?: string | null
  secretMatched: boolean
  secretHint: string
  conversionId?: string | null
  publisherId?: string | null
  trackingLinkId?: string | null
  ip?: string | null
}

/**
 * Masked preview of a received secret — enough to spot a typo, a truncated
 * value or stray whitespace without writing the secret itself into the log.
 */
export function maskSecret(secret: string | null | undefined): string {
  if (!secret) return 'none sent'
  const trimmed = secret.trim()
  const padding = trimmed.length === secret.length ? '' : ' + whitespace'
  const preview =
    trimmed.length <= 4
      ? trimmed
      : `${trimmed.slice(0, 2)}…${trimmed.slice(-2)}`
  return `${preview} (${trimmed.length} chars${padding})`
}

/**
 * Audit row for a callback that did not credit anything. Credited callbacks
 * write their row inside the crediting transaction instead, so the audit of a
 * conversion can never be lost. Best-effort: a failed write must not turn a
 * rejection into a 500 that makes the sender retry.
 */
export async function recordConversionEvent(entry: ConversionEventInput): Promise<void> {
  try {
    await prisma.conversionEvent.create({ data: entry })
  } catch (error) {
    console.error('[conversion event write failed]', error)
  }
}
