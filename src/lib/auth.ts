import jwt from 'jsonwebtoken'

export type Role = 'admin' | 'publisher' | 'traffic'

const SECRET_ENV: Record<Role, string> = {
  admin: 'JWT_SECRET_ADMIN',
  publisher: 'JWT_SECRET_PUBLISHER',
  traffic: 'JWT_SECRET_TRAFFIC',
}

// Development-only fallbacks. They are public in this repo, so anyone could
// forge a token with them — production refuses to run on them.
const DEV_SECRETS: Record<Role, string> = {
  admin: 'default_admin_secret_key_32_chars_min',
  publisher: 'default_publisher_secret_key_32_chars_min',
  traffic: 'default_traffic_secret_key_32_chars_min',
}

export interface TokenPayload {
  id: string
  email: string
  role: Role
}

// Read per call, not at import, so `next build` never needs the secrets.
function getSecret(role: Role): string {
  const secret = process.env[SECRET_ENV[role]]
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${SECRET_ENV[role]} must be set in production`)
  }
  return DEV_SECRETS[role]
}

export function signToken(payload: { id: string; email: string }, role: Role): string {
  return jwt.sign(
    { id: payload.id, email: payload.email, role },
    getSecret(role),
    { expiresIn: '7d' }
  )
}

export function verifyToken(token: string, role: Role): TokenPayload | null {
  try {
    return jwt.verify(token, getSecret(role)) as TokenPayload
  } catch {
    return null
  }
}

// ─── Legacy compatibility functions to prevent breaking other files ──────────
export function signPublisherToken(payload: { publisherId: string; email: string }): string {
  return signToken({ id: payload.publisherId, email: payload.email }, 'publisher')
}

export function verifyPublisherToken(token: string): { publisherId: string; email: string; role: 'publisher' } {
  const decoded = verifyToken(token, 'publisher')
  if (!decoded) throw new Error('Invalid token')
  return { publisherId: decoded.id, email: decoded.email, role: 'publisher' }
}

export function signAdminToken(payload: { adminId: string; email: string }): string {
  return signToken({ id: payload.adminId, email: payload.email }, 'admin')
}

export function verifyAdminToken(token: string): { adminId: string; email: string; role: 'admin' } {
  const decoded = verifyToken(token, 'admin')
  if (!decoded) throw new Error('Invalid token')
  return { adminId: decoded.id, email: decoded.email, role: 'admin' }
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}
