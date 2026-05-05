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

        // Rate limiting by IP
        const ip =
          request?.headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim() ||
          'unknown'
        if (isRateLimited(ip)) {
          throw new Error('Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.')
        }

        const email = credentials.email as string
        const password = credentials.password as string

        // ── Step 1: Try AuthUser (admin/agent/viewer) ──
        const authUser = await db.authUser.findUnique({
          where: { email },
        })

        if (authUser && authUser.password) {
          if (!authUser.isActive) {
            throw new Error('Votre compte a été désactivé. Contactez un administrateur.')
          }

          const isPasswordValid = await bcrypt.compare(password, authUser.password)
          if (isPasswordValid) {
            return {
              id: authUser.id,
              name: authUser.name,
              email: authUser.email,
              image: authUser.image,
              role: authUser.role,
              airportCode: authUser.airportCode,
              isActive: authUser.isActive,
            }
          }
        }

        // ── Step 2: Try PartnerUser (partner) ──
        const partnerUser = await db.partnerUser.findUnique({
          where: { email },
          include: { Partner: true },
        })

        if (partnerUser && partnerUser.password) {
          if (!partnerUser.isActive) {
            throw new Error('Votre compte a été désactivé. Contactez un administrateur.')
          }

          if (!partnerUser.Partner?.isActive) {
            throw new Error('Votre organisation partenaire a été désactivée.')
          }

          const isPasswordValid = await bcrypt.compare(password, partnerUser.password)
          if (isPasswordValid) {
            return {
              id: `partner-${partnerUser.id}`, // prefixed to avoid collision with AuthUser IDs
              name: partnerUser.name,
              email: partnerUser.email,
              image: null,
              role: 'PARTNER',
              airportCode: partnerUser.Partner.airportCode,
              isActive: partnerUser.isActive,
              partnerId: partnerUser.partnerId,
              partnerType: partnerUser.Partner.type,
            }
          }
        }

        // ── No user found ──
        return null
      },
    }),
  ],
})
