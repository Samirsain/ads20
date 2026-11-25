import { Prisma } from '@prisma/client'

// Scale factor 10,000 keeps 4 decimal places ($0.0001) exact via BigInt.
const SCALE = 10000n
const CENTS_SCALE = 100n

export const MIN_WITHDRAWAL_USD = 15
export const MIN_WITHDRAWAL_MICROS = 15n * SCALE

/** Convert Decimal, number, or string into exact scaled BigInt micros ($0.0001). */
export function toMicros(value: Prisma.Decimal | number | string | null | undefined): bigint {
  if (value === null || value === undefined) return 0n
  const str = typeof value === 'string' ? value.trim() : value.toString()
  if (!str) return 0n

  const neg = str.startsWith('-')
  const unsigned = neg ? str.slice(1) : str
  const [wholePartRaw, fracPartRaw = ''] = unsigned.split('.')
  const wholePart = wholePartRaw.replace(/[^0-9]/g, '') || '0'
  const fracPadded = (fracPartRaw.replace(/[^0-9]/g, '') + '0000').slice(0, 4)

  const micros = BigInt(wholePart) * SCALE + BigInt(fracPadded)
  return neg ? -micros : micros
}

/** Format scaled BigInt micros as a fixed decimal string (default 2 decimals, or 4). */
export function formatMicros(micros: bigint, decimals: 2 | 4 = 2): string {
  const neg = micros < 0n
  const abs = neg ? -micros : micros
  const rounded =
    decimals === 2
      ? ((abs + 50n) / 100n) * 100n
      : abs

  const whole = rounded / SCALE
  const frac4 = (rounded % SCALE).toString().padStart(4, '0')
  const frac = decimals === 2 ? frac4.slice(0, 2) : frac4
  return `${neg ? '-' : ''}${whole.toString()}.${frac}`
}

/** Convert scaled BigInt micros to a number rounded to 4 decimal places for JSON serialization. */
export function microsToNumber(micros: bigint, decimals: 2 | 4 = 4): number {
  return Number(formatMicros(micros, decimals))
}

/** Convert scaled BigInt micros to Prisma.Decimal (exact string representation). */
export function microsToDecimal(micros: bigint): Prisma.Decimal {
  return new Prisma.Decimal(formatMicros(micros, 4))
}

/** Round micros to nearest US cent ($0.01) as micros. */
export function roundMicrosToCents(micros: bigint): bigint {
  const step = SCALE / CENTS_SCALE // 100n
  return ((micros + step / 2n) / step) * step
}

