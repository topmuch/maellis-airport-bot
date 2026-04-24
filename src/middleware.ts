import { auth } from '@/auth'
import { NextResponse } from 'next/server'

// ─────────────────────────────────────────────
// Route Protection Middleware
// Works alongside auth.config.ts authorized() callback
// This provides additional granular API route guards
// ─────────────────────────────────────────────

export default auth((req) => {
  const { pathname } = req.nextUrl
  const userRole = (req.auth?.user as any)?.role

  // ── Public API routes (no auth required) ──
  const publicApiPatterns = [
    '/api/auth/',
    '/api/bot/',
    '/api/webhooks/',
    '/api/ads/public/',
    '/api/flights/airports',
  ]

  const isPublicApi = publicApiPatterns.some(p => pathname.startsWith(p))

  // ── Public page routes ──
  const publicPageRoutes = [
    '/',
    '/auth/login',
    '/auth/register',
    '/auth/admin',
    '/auth/partner',
  ]

  // ── Protected API routes by role ──
  // /api/admin/* → SUPERADMIN or AIRPORT_ADMIN only
  if (pathname.startsWith('/api/admin/')) {
    if (!req.auth) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    if (userRole !== 'SUPERADMIN' && userRole !== 'AIRPORT_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
  }

  // /api/partners/* → requires auth
  if (pathname.startsWith('/api/partners/') && !isPublicApi) {
    if (!req.auth) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
  }

  // ── All other /api/* routes require auth ──
  if (pathname.startsWith('/api/') && !isPublicApi) {
    if (!req.auth) {
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
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' ws: wss:; frame-ancestors 'none'")

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
