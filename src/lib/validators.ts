import { z } from 'zod'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const publisherRegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().optional(),
})

export const publisherLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const trafficUserRegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().optional(),
})

export const trafficUserLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// ─── Links ────────────────────────────────────────────────────────────────────

export const createLinkSchema = z.object({
  linkType: z.enum(['direct', 'smart']).default('direct'),
})

export const createTrafficLinkSchema = z.object({
  targetUrl: z.string().url('Must be a valid URL'),
})

// ─── Withdrawal ───────────────────────────────────────────────────────────────

export const withdrawalSchema = z.object({
  amount: z.number().finite('Invalid amount').positive('Amount must be positive').min(15, 'Minimum withdrawal is $15.00'),
  walletAddress: z.string().trim().min(10, 'Invalid wallet address').max(100, 'Wallet address too long'),
  network: z.enum(['TRC20', 'ERC20', 'BEP20'], { message: 'Invalid network' }),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
})

// ─── Postback ─────────────────────────────────────────────────────────────────

export const postbackBodySchema = z.object({
  code: z.string().trim().min(1, 'code is required').max(64, 'code too long'),
  // PaisaWin registration reference — the deduplication key.
  uid: z.string().trim().min(1, 'uid is required').max(191, 'uid too long'),
  // Optional: when the sender omits it we resolve the type from the code itself,
  // so a postback missing `type` still credits the conversion.
  type: z.enum(['publisher', 'traffic']).optional(),
  secret: z.string().min(1, 'secret is required').max(256, 'secret too long'),
  // Echo of the click_id we appended to the landing URL. Optional for senders
  // that predate it.
  click_id: z.string().trim().min(1).max(64).optional(),
  // Absent = success. Anything not in the success list is logged, not counted.
  status: z.string().trim().max(32, 'status too long').optional(),
})

export type PostbackBody = z.infer<typeof postbackBodySchema>

// ─── Admin ────────────────────────────────────────────────────────────────────

export const updateWithdrawalSchema = z.object({
  status: z.enum(['APPROVED', 'PROCESSING', 'PAID', 'REJECTED', 'UNCERTAIN']),
  note: z.string().trim().max(500).optional(),
  txReference: z.string().trim().max(150).optional(),
  failureReason: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
})

export const adminSettingsSchema = z.object({
  key: z.string().min(1),
  // Trimmed: stray whitespace in a pasted secret or URL silently breaks matching
  value: z.string().trim().min(1),
})

export const reportClearPreviewSchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must be YYYY-MM-DD')).min(1).max(90),
})

export const reportClearExecuteSchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must be YYYY-MM-DD')).min(1).max(90),
  reason: z.string().trim().min(3, 'Please provide a reason (at least 3 characters)').max(500),
  confirmed: z.literal(true, { message: 'Explicit confirmation is required' }),
  confirmedLargeRange: z.boolean().optional(),
})

export const reportRestoreSchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must be YYYY-MM-DD')).min(1).max(90),
  reason: z.string().trim().min(3, 'Please provide a restore reason').max(500),
})

// ─── Pagination ───────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})
