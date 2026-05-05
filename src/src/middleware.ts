import { auth } from '@/auth'
import { NextResponse } from 'next/server'

// ─────────────────────────────────────────────
// Route Protection Middleware — NextAuth v5 Only
// ─────────────────────────────────────────────
// Unified auth: reads HttpOnly session cookie via NextAuth.
// No more Bearer token / JWT header checking.
// ─────────────────────────────────────────────

export default auth((req) => {
  const { pathname } = req.nextUrl

  // ── Public API routes (no auth required) ──
  const publicApiExact = [
    '/api/auth/login',
    '/api/auth/me',
    '/api/auth/refresh',
    '/api/contact',
  ]

  const publicApiPrefixes = [
    '/api/auth/',
    '/api/bot/',
    '/api/webhooks/',
    '/api/ads/public/',
    '/api/flights/airports',
    '/api/broadcast/active',
    '/api/broadcast/stream',
    '/api/partners/activate',
    '/api/partners/verify-token',
  ]

  const isPublicApi =
    publicApiExact.includes(pathname) ||
    publicApiPrefixes.some((p) => pathname.startsWith(p))

  // ── Static files & assets (always pass through) ──
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // ── Protected API routes by role ──
  // /api/admin/* → SUPERADMIN or AIRPORT_ADMIN only
  if (pathname.startsWith('/api/admin/')) {
    if (!req.auth) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 },
      )
    }
    const userRole = ((req.auth?.user as Record<string, unknown>)?.role as string)?.toUpperCase()
    if (userRole !== 'SUPERADMIN' && userRole !== 'AIRPORT_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 },
      )
    }
  }

  // /api/partners/* (non-public) → requires auth
  if (pathname.startsWith('/api/partners/') && !isPublicApi) {
    if (!req.auth) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 },
      )
    }
  }

  // ── All other /api/* routes require auth ──
  if (pathname.startsWith('/api/') && !isPublicApi) {
    if (!req.auth) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 },
      )
    }
  }

  // ── Security headers for all responses ──
  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return response
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
}
