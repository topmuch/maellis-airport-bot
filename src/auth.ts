import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { authConfig } from '@/auth.config'

// ─────────────────────────────────────────────
// Rate Limiting — Simple in-memory tracker
// ─────────────────────────────────────────────

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = loginAttempts.get(ip)

  if (!record || now - record.lastAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now })
    return false
  }

  record.count++
  record.lastAttempt = now

  if (record.count > MAX_ATTEMPTS) {
    return true
  }

  return false
}

// Cleanup stale entries every 15 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of loginAttempts.entries()) {
    if (now - record.lastAttempt > WINDOW_MS) {
      loginAttempts.delete(ip)
    }
  }
}, WINDOW_MS)

// ─────────────────────────────────────────────
// NextAuth v5 Configuration
// ─────────────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  adapter: PrismaAdapter(db) as any,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Rate limiting by IP (from request headers)
        const ip =
          (request as any)?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          'unknown'
        if (isRateLimited(ip)) {
          throw new Error('Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.')
        }

        // Find user by email
        const user = await db.authUser.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.password) {
          return null
        }

        // Check if user is active
        if (!user.isActive) {
          throw new Error('Votre compte a été désactivé. Contactez un administrateur.')
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          airportCode: user.airportCode,
          isActive: user.isActive,
        }
      },
    }),
  ],
})
