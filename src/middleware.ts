import { NextRequest, NextResponse } from 'next/server'
import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'

// ─────────────────────────────────────────────
// Route Protection Middleware — Edge Compatible
// ─────────────────────────────────────────────
// Uses ONLY authConfig (no PrismaAdapter, no Node.js modules) for Edge runtime.
// The full auth with Prisma is in auth.ts (server-side only).
// ─────────────────────────────────────────────

const { auth } = NextAuth({
  ...authConfig,
  trustHost: true,
})

export default auth(async (req) => {
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
