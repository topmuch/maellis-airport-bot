import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// ─────────────────────────────────────────────
// Route Protection Middleware
// Works alongside auth.config.ts authorized() callback
// This provides additional granular API route guards
// Supports BOTH NextAuth sessions AND JWT Bearer tokens
// ─────────────────────────────────────────────

/**
 * Check if a request has valid authentication via either:
 * 1. NextAuth session (req.auth)
 * 2. JWT Bearer token in Authorization header
 */
function isAuthenticated(req: { auth?: any; headers?: { get: (name: string) => string | null } }): boolean {
  // Check NextAuth session
  if (req.auth) return true

  // Check JWT Bearer token
  const authHeader = req.headers?.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    if (token) {
      const result = verifyToken(token)
      return result.success === true
    }
  }

  return false
}

/**
 * Extract role from either NextAuth session or JWT token
 */
function getUserRole(req: { auth?: any; headers?: { get: (name: string) => string | null } }): string | undefined {
  // Check NextAuth session first
  if (req.auth?.user) {
    return (req.auth.user as any)?.role
  }

  // Fall back to JWT token
  const authHeader = req.headers?.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    if (token) {
      const result = verifyToken(token)
      return result.success ? result.user?.role : undefined
    }
  }

  return undefined
}

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
  ]

  const isPublicApi =
    publicApiExact.includes(pathname) ||
    publicApiPrefixes.some(p => pathname.startsWith(p))

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
    if (!isAuthenticated(req)) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    const userRole = getUserRole(req)
    if (userRole !== 'SUPERADMIN' && userRole !== 'AIRPORT_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
  }

  // /api/partners/* → requires auth
  if (pathname.startsWith('/api/partners/') && !isPublicApi) {
    if (!isAuthenticated(req)) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
  }

  // ── All other /api/* routes require auth ──
  if (pathname.startsWith('/api/') && !isPublicApi) {
    if (!isAuthenticated(req)) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
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
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public assets (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
}
