import { verifyToken, extractBearerToken } from '@/lib/auth'
import type { NextRequest } from 'next/server'

export function getPublisherFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token =
    extractBearerToken(authHeader) ?? request.cookies.get('pub_token')?.value ?? null

  if (!token) return null
  try {
    const payload = verifyToken(token, 'publisher')
    if (!payload) return null
    return { publisherId: payload.id, email: payload.email }
  } catch {
    return null
  }
}

export function getAdminFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token =
    extractBearerToken(authHeader) ?? request.cookies.get('admin_token')?.value ?? null

  if (!token) return null
  try {
    const payload = verifyToken(token, 'admin')
    if (!payload) return null
    return { adminId: payload.id, email: payload.email }
  } catch {
    return null
  }
}

export function getTrafficUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token =
    extractBearerToken(authHeader) ?? request.cookies.get('traffic_token')?.value ?? null

  if (!token) return null
  try {
    const payload = verifyToken(token, 'traffic')
    if (!payload) return null
    return { userId: payload.id, email: payload.email }
  } catch {
    return null
  }
}

export function unauthorizedResponse() {
  return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
}

export function forbiddenResponse() {
  return Response.json({ success: false, error: 'Forbidden' }, { status: 403 })
}
