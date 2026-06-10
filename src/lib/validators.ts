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
  amount: z.number().positive('Amount must be positive').min(10, 'Minimum withdrawal is $10'),
  upiId: z.string().min(5, 'Invalid UPI ID').max(50),
})

// ─── Postback ─────────────────────────────────────────────────────────────────

export const postbackBodySchema = z.object({
  code: z.string().min(1, 'code is required'),
  uid: z.string().min(1, 'uid is required'),
  type: z.enum(['publisher', 'traffic']),
  secret: z.string().min(1, 'secret is required'),
})

export const postbackQuerySchema = z.object({
  publisher_id: z.string().min(1, 'publisher_id is required'),
  user_id: z.string().min(1, 'user_id is required'),
  event: z.string().min(1, 'event is required'),
  secret: z.string().min(1, 'secret is required'),
})

// ─── Admin ────────────────────────────────────────────────────────────────────

export const updateWithdrawalSchema = z.object({
  status: z.enum(['PAID', 'REJECTED']),
  note: z.string().optional(),
})

export const adminSettingsSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
})

// ─── Pagination ───────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})
