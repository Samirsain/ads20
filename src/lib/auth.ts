import jwt from 'jsonwebtoken'

const ADMIN_SECRET = process.env.JWT_SECRET_ADMIN || 'default_admin_secret_key_32_chars_min'
const PUBLISHER_SECRET = process.env.JWT_SECRET_PUBLISHER || 'default_publisher_secret_key_32_chars_min'
const TRAFFIC_SECRET = process.env.JWT_SECRET_TRAFFIC || 'default_traffic_secret_key_32_chars_min'

export type Role = 'admin' | 'publisher' | 'traffic'

export interface TokenPayload {
  id: string
  email: string
  role: Role
}

function getSecret(role: Role): string {
  switch (role) {
    case 'admin':
      return ADMIN_SECRET
    case 'publisher':
      return PUBLISHER_SECRET
    case 'traffic':
      return TRAFFIC_SECRET
  }
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
