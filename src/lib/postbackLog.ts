import { prisma } from '@/lib/prisma'

export const POSTBACK_LOG_KEY = 'postback_log'
const MAX_ENTRIES = 25

export type PostbackLogEntry = {
  at: string
  source: 'GET' | 'POST'
  code: string | null
  uid: string | null
  type: string | null
  secretMatched: boolean
  secretHint: string
  result: string
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
 * Keeps the last few postback attempts so an admin can tell whether the
 * external platform is calling us at all, and why an attempt was rejected.
 * Stored in GlobalConfig to avoid a schema migration, and always best-effort:
 * logging must never break or delay crediting a conversion.
 */
export async function recordPostbackAttempt(entry: PostbackLogEntry): Promise<void> {
  try {
    const existing = await prisma.globalConfig.findUnique({
      where: { key: POSTBACK_LOG_KEY },
    })

    const entries = [entry, ...readEntries(existing?.value)].slice(0, MAX_ENTRIES)
    const value = JSON.stringify(entries)

    await prisma.globalConfig.upsert({
      where: { key: POSTBACK_LOG_KEY },
      update: { value },
      create: { key: POSTBACK_LOG_KEY, value },
    })
  } catch (error) {
    console.error('[postback log write failed]', error)
  }
}

export function readEntries(value: string | undefined | null): PostbackLogEntry[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as PostbackLogEntry[]) : []
  } catch {
    return []
  }
}
