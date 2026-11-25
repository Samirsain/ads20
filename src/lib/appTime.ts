// Timestamps are stored in UTC; day boundaries and display use this timezone.
export const APP_TIMEZONE = process.env.APP_TIMEZONE?.trim() || 'Asia/Kolkata'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isDateStr(value: string | null | undefined): value is string {
  if (!value || !DATE_RE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const check = new Date(Date.UTC(y, m - 1, d))
  return (
    check.getUTCFullYear() === y &&
    check.getUTCMonth() === m - 1 &&
    check.getUTCDate() === d
  )
}

/** Calendar date (YYYY-MM-DD) of `at` in `timeZone`. */
export function dateIn(at: Date, timeZone = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at)
}

/** Current calendar date (YYYY-MM-DD) in APP_TIMEZONE (Asia/Kolkata). */
export function todayIST(now = new Date()): string {
  return dateIn(now, APP_TIMEZONE)
}

/** Yesterday's calendar date (YYYY-MM-DD) in APP_TIMEZONE (Asia/Kolkata). */
export function yesterdayIST(now = new Date()): string {
  return addDays(todayIST(now), -1)
}

/** Offset of `timeZone` from UTC at instant `at`, in ms. */
function offsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(at.getTime() / 1000) * 1000
}

/** UTC instant at which calendar day `dateStr` begins in `timeZone`. */
export function startOfDay(dateStr: string, timeZone = APP_TIMEZONE): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const wall = Date.UTC(y, m - 1, d)
  // Second pass corrects the offset on days with a DST transition.
  const first = wall - offsetMs(new Date(wall), timeZone)
  return new Date(wall - offsetMs(new Date(first), timeZone))
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** Inclusive from/to calendar dates → Prisma `{ gte, lt }` range. Invalid dates are ignored. */
export function dayRange(
  from: string | null,
  to: string | null,
  timeZone = APP_TIMEZONE
): { gte?: Date; lt?: Date } | undefined {
  const range: { gte?: Date; lt?: Date } = {}
  if (isDateStr(from)) range.gte = startOfDay(from, timeZone)
  if (isDateStr(to)) range.lt = startOfDay(addDays(to, 1), timeZone)
  return range.gte || range.lt ? range : undefined
}

/** Enumerate inclusive calendar dates from `from` to `to` (capped at `maxDays`). */
export function enumerateDateRange(from: string, to: string, maxDays = 90): string[] {
  if (!isDateStr(from) || !isDateStr(to) || from > to) return []
  const dates: string[] = []
  let cursor = from
  while (cursor <= to && dates.length < maxDays) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return dates
}

/** Current time details and 12:00 PM - 2:00 PM IST daily payout window check. */
export function getPayoutWindowStatus(now = new Date(), timeZone = APP_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(now)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  const minutesOfDay = hour * 60 + minute
  const active = minutesOfDay >= 12 * 60 && minutesOfDay < 14 * 60

  const currentIstTime = new Intl.DateTimeFormat('en-IN', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(now)

  const today = dateIn(now, timeZone)
  const nextBatchDate = minutesOfDay < 14 * 60 ? today : addDays(today, 1)

  return {
    active,
    timezone: timeZone,
    today,
    nextBatchDate,
    currentIstTime,
    windowLabel: '12:00 PM – 2:00 PM IST',
  }
}
