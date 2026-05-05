import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'

// ─────────────────────────────────────────────────────────────────────────────
// Edge-compatible auth export for middleware ONLY
// ─────────────────────────────────────────────────────────────────────────────
// This file does NOT import PrismaAdapter or any Node.js-only modules.
// The full auth setup (with Prisma + credentials provider) is in auth.ts.
// ─────────────────────────────────────────────────────────────────────────────

export const { auth } = NextAuth({
  ...authConfig,
  trustHost: true,
})
