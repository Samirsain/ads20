import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Admin Portal Protection
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = request.cookies.get('admin_token')?.value
    if (!token || !verifyToken(token, 'admin')) {
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
    if (!token || !verifyToken(token, 'publisher')) {
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
    if (!token || !verifyToken(token, 'traffic')) {
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
