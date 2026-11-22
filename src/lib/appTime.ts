// Timestamps are stored in UTC; day boundaries and display use this timezone.
export const APP_TIMEZONE = process.env.APP_TIMEZONE?.trim() || 'Asia/Kolkata'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isDateStr(value: string | null | undefined): value is string {
  return !!value && DATE_RE.test(value)
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
