import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_SECRET = process.env.JWT_SECRET_ADMIN || 'default_admin_secret_key_32_chars_min'
const PUBLISHER_SECRET = process.env.JWT_SECRET_PUBLISHER || 'default_publisher_secret_key_32_chars_min'
const TRAFFIC_SECRET = process.env.JWT_SECRET_TRAFFIC || 'default_traffic_secret_key_32_chars_min'

function toKey(secret: string) {
  return new TextEncoder().encode(secret)
}

async function verifyEdgeToken(token: string, secret: string): Promise<boolean> {
  try {
    await jwtVerify(token, toKey(secret))
    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Admin Portal Protection
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = request.cookies.get('admin_token')?.value
    if (!token || !(await verifyEdgeToken(token, ADMIN_SECRET))) {
      const response = NextResponse.redirect(new URL('/admin/login', request.url))
      response.cookies.delete('admin_token')
      return response
    }
  }

  // 2. Publisher Portal Protection
  if (
    pathname.startsWith('/publisher') &&
    pathname !== '/publisher/login' &&
    pathname !== '/publisher/register'
  ) {
    const token = request.cookies.get('pub_token')?.value
    if (!token || !(await verifyEdgeToken(token, PUBLISHER_SECRET))) {
      const response = NextResponse.redirect(new URL('/publisher/login', request.url))
      response.cookies.delete('pub_token')
      return response
    }
  }

  // 3. Traffic Portal Protection
  if (
    pathname.startsWith('/traffic') &&
    pathname !== '/traffic/login' &&
    pathname !== '/traffic/register'
  ) {
    const token = request.cookies.get('traffic_token')?.value
    if (!token || !(await verifyEdgeToken(token, TRAFFIC_SECRET))) {
      const response = NextResponse.redirect(new URL('/traffic/login', request.url))
      response.cookies.delete('traffic_token')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/publisher/:path*',
    '/traffic/:path*',
  ],
}
