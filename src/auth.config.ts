import type { NextAuthConfig } from 'next-auth'

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
      const { pathname, search } = nextUrl
      const isLoggedIn = !!auth

      // Public routes (no auth needed)
      const publicRoutes = ['/auth/login', '/auth/register', '/auth/admin', '/auth/partner', '/partner/login', '/contact', '/privacy', '/about']
      const isPublic = publicRoutes.some((r) => pathname.startsWith(r))

      // Public API routes (no auth needed — don't redirect these)
      const publicApiRoutes = ['/api/auth/', '/api/bot/', '/api/webhooks/', '/api/ads/public/', '/api/flights/airports', '/api/broadcast/active', '/api/broadcast/stream', '/api/contact']
      const isPublicApi = publicApiRoutes.some((r) => pathname.startsWith(r))

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
      if (isLoggedIn && authOnlyPages.includes(pathname)) {
        const url = nextUrl.clone()
        url.pathname = '/'
        url.searchParams.set('showLanding', 'false')
        return Response.redirect(url)
      }

      // Dashboard protection: /?showLanding=false requires auth
      const isDashboardView = pathname === '/' && search.includes('showLanding=false')

      // Redirect unauthenticated users to login (page routes only, not API)
      const isApiRoute = pathname.startsWith('/api/')
      if (!isLoggedIn && !isPublic && !isPublicApi && !isApiRoute && (pathname !== '/' || isDashboardView)) {
        const loginUrl = nextUrl.clone()
        loginUrl.pathname = '/auth/login'
        loginUrl.searchParams.set('callbackUrl', pathname + search)
        return Response.redirect(loginUrl)
      }

      // For API routes: let the middleware handle auth (NextAuth cookie only)
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
        token.partnerId = user.partnerId
        token.partnerType = user.partnerType
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.role = token.role
        session.user.airportCode = token.airportCode
        session.user.isActive = token.isActive
        session.user.userId = token.userId
        session.user.partnerId = token.partnerId
        session.user.partnerType = token.partnerType
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
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
} satisfies NextAuthConfig
