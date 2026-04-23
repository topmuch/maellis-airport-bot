import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

// ─── Configuration ─────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'maellis-dev-secret'

// Routes that require authentication
const PROTECTED_API_ROUTES = [
  '/api/admin/',
  '/api/partners/',
  '/api/reports/',
  '/api/audit-logs/',
]

// Routes that are always public (no auth check needed)
const PUBLIC_ROUTES = [
  '/api/auth/',
  '/api/flights/',
  '/api/dashboard/',     // Dashboard API is public for now (demo mode)
  '/api/lounges/',
  '/api/transport/',
  '/api/emergency/',
  '/api/merchants/',
  '/api/products/',
  '/api/orders/',
  '/api/ads/',
  '/api/reviews/',
  '/api/wishlist/',
  '/api/settings/',
]

// ─── Middleware ────────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip non-API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Skip public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check protected API routes
  const isProtected = PROTECTED_API_ROUTES.some((route) =>
    pathname.startsWith(route),
  )

  if (!isProtected) {
    return NextResponse.next()
  }

  // Verify JWT token
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 },
    )
  }

  const token = authHeader.substring(7)
  try {
    jwt.verify(token, JWT_SECRET)
    return NextResponse.next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return NextResponse.json(
        { success: false, error: 'Token expired' },
        { status: 401 },
      )
    }
    return NextResponse.json(
      { success: false, error: 'Invalid token' },
      { status: 401 },
    )
  }
}

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
  ],
}
