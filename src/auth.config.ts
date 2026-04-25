import type { NextAuthConfig } from 'next-auth'
import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export const authConfig = {
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt',
  },
  providers: [], // Providers are added in auth.ts (not needed for middleware edge runtime)
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl
      const isLoggedIn = !!auth

      // ── Fast path: check for valid JWT Bearer token ──
      // This allows API routes to work with both NextAuth sessions and JWT tokens
      const reqHeaders = typeof window === 'undefined' ? null : null
      // Note: request headers are not directly accessible in authorized() callback.
      // JWT token validation is handled in middleware.ts instead.

      // Public routes (no auth needed)
      const publicRoutes = ['/auth/login', '/auth/register', '/auth/admin', '/auth/partner', '/partner/login', '/contact', '/privacy', '/about']
      const isPublic = publicRoutes.some(r => pathname.startsWith(r))

      // Public API routes (no auth needed — don't redirect these)
      const publicApiRoutes = ['/api/auth/', '/api/bot/', '/api/webhooks/', '/api/ads/public/', '/api/flights/airports', '/api/broadcast/active', '/api/broadcast/stream', '/api/contact']
      const isPublicApi = publicApiRoutes.some(r => pathname.startsWith(r))

      // Static files & assets
      if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
      ) {
        return true
      }

      // Redirect logged-in users away from auth pages → dashboard
      const authOnlyPages = ['/auth/login', '/auth/register', '/auth/admin', '/auth/partner', '/partner/login']
      if (
        isLoggedIn &&
        authOnlyPages.includes(pathname)
      ) {
        const url = nextUrl.clone()
        url.pathname = '/'
        url.searchParams.set('showLanding', 'false')
        return Response.redirect(url)
      }

      // Redirect unauthenticated users to login (page routes only, not API)
      const isApiRoute = pathname.startsWith('/api/')
      if (!isLoggedIn && !isPublic && !isPublicApi && pathname !== '/' && !isApiRoute) {
        const loginUrl = nextUrl.clone()
        loginUrl.pathname = '/auth/login'
        loginUrl.searchParams.set('callbackUrl', pathname)
        return Response.redirect(loginUrl)
      }

      // For API routes: let the middleware handle auth (supports both NextAuth + JWT)
      // Return true here so the middleware function can check JWT Bearer tokens
      if (isApiRoute) {
        return true
      }

      return true
    },
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.role = user.role
        token.airportCode = user.airportCode
        token.isActive = user.isActive
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.role = token.role
        session.user.airportCode = token.airportCode
        session.user.isActive = token.isActive
        session.user.userId = token.userId
      }
      return session
    },
    async signIn({ user, account }) {
      // Only allow credentials provider
      if (account?.provider !== 'credentials') {
        return false
      }
      // isActive is already checked in the authorize function
      return true
    },
  },
  secret: (() => {
    const s = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
    if (!s && process.env.NODE_ENV === 'production') {
      throw new Error('[AUTH] NEXTAUTH_SECRET (or AUTH_SECRET) is required in production. Generate one with: openssl rand -base64 32')
    }
    if (!s) {
      console.warn('[AUTH] NEXTAUTH_SECRET is not set. Sessions will be unstable. Set it in .env')
    }
    return s
  })(),
} satisfies NextAuthConfig
