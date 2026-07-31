import type { NextRequest } from 'next/server'

/**
 * Base URL to build public tracking links from.
 *
 * Prefers NEXT_PUBLIC_APP_URL so a custom domain can be pinned regardless of
 * which host served the request. When that is unset it derives the origin from
 * the request itself, which keeps links correct on Vercel — including preview
 * deployments — without any configuration. Behind Vercel's proxy the useful
 * host is in `x-forwarded-host`; `request.nextUrl.origin` reports the internal
 * one, so the headers are checked first.
 *
 * Falls back to localhost only when there is no request to read, e.g. during a
 * build-time render.
 */
export function getAppUrl(request?: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) return stripTrailingSlash(configured)

  const host =
    request?.headers.get('x-forwarded-host') ?? request?.headers.get('host')

  if (host) {
    const proto =
      request?.headers.get('x-forwarded-proto') ??
      (host.startsWith('localhost') || host.startsWith('127.0.0.1')
        ? 'http'
        : 'https')
    return stripTrailingSlash(`${proto}://${host}`)
  }

  return 'http://localhost:3000'
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}
