import type { NextAuthConfig } from 'next-auth'
import { NextResponse } from 'next/server'

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
      const userRole = (auth?.user as any)?.role

      // Public routes (no auth needed)
      const publicRoutes = ['/auth/login', '/auth/register', '/auth/admin', '/auth/partner', '/api/auth']
      const isPublic = publicRoutes.some(r => pathname.startsWith(r))

      // Static files & assets
      if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
      ) {
        return true
      }

      // Redirect logged-in users away from auth pages
      if (
        isLoggedIn &&
        (pathname === '/auth/login' || pathname === '/auth/register' || pathname === '/auth/admin' || pathname === '/auth/partner')
      ) {
        const url = nextUrl.clone()
        url.pathname = '/'
        return Response.redirect(url)
      }

      // Redirect unauthenticated users to login (protect everything except public + landing)
      if (!isLoggedIn && !isPublic && pathname !== '/') {
        const loginUrl = nextUrl.clone()
        loginUrl.pathname = '/auth/login'
        loginUrl.searchParams.set('callbackUrl', pathname)
        return Response.redirect(loginUrl)
      }

      // API route protection
      if (pathname.startsWith('/api/')) {
        // /api/auth/* is always public (NextAuth handler)
        if (pathname.startsWith('/api/auth/')) return true
        // /api/public/*, /api/bot/*, /api/webhooks/* are public
        if (
          pathname.startsWith('/api/public/') ||
          pathname.startsWith('/api/bot/') ||
          pathname.startsWith('/api/webhooks/')
        )
          return true
        // All other API routes require auth
        if (!isLoggedIn) {
          return NextResponse.json(
            { error: 'Unauthorized', code: 'UNAUTHORIZED' },
            { status: 401 }
          )
        }
        // /api/admin/* requires AIRPORT_ADMIN or SUPERADMIN
        if (
          pathname.startsWith('/api/admin/') &&
          userRole !== 'SUPERADMIN' &&
          userRole !== 'AIRPORT_ADMIN'
        ) {
          return NextResponse.json(
            { error: 'Forbidden', code: 'FORBIDDEN' },
            { status: 403 }
          )
        }
      }

      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.airportCode = (user as any).airportCode
        token.isActive = (user as any).isActive
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role
        (session.user as any).airportCode = token.airportCode
        (session.user as any).isActive = token.isActive
        (session.user as any).userId = token.userId
      }
      return session
    },
    async signIn({ user, account }) {
      // Only apply isActive check for credentials provider
      if (account?.provider === 'credentials' && user) {
        // isActive is already checked in the authorize function
      }
      return true
    },
  },
  secret: process.env.AUTH_SECRET || 'smartly-auth-secret-change-in-production-v1',
} satisfies NextAuthConfig
