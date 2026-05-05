/**
 * Maellis Auth Utilities — Unified NextAuth v5
 *
 * ARCHITECTURE:
 * - All authentication goes through NextAuth v5 (cookie-based, HttpOnly)
 * - `requireAuth()` reads the session via `auth()` from NextAuth
 * - No more Bearer token / JWT header checking for authentication
 * - JWT utilities kept for non-auth purposes (partner invitations)
 *
 * MIGRATION:
 * - Old: `requireRole('superadmin')(request)` — checked Bearer token header
 * - New: `requireRole('superadmin')(request)` — reads NextAuth cookie via `auth()`
 *   The `request` parameter is ACCEPTED but IGNORED for backward compatibility.
 *   This means ALL existing route handlers work without changes.
 */

import bcrypt from 'bcryptjs'
import { auth } from '@/auth'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

// Canonical (UPPERCASE) roles — matches NextAuth v5 and role-guard.ts
export const VALID_ROLES = ['SUPERADMIN', 'AIRPORT_ADMIN', 'PARTNER', 'AGENT', 'VIEWER'] as const
export type Role = (typeof VALID_ROLES)[number]

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  airportCode?: string
  partnerId?: string
  partnerType?: string
}

export interface AuthResult {
  success: boolean
  user?: AuthUser
  error?: string
  status?: number
}

// ─────────────────────────────────────────────
// Password Utilities
// ─────────────────────────────────────────────

const SALT_ROUNDS = 12

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ─────────────────────────────────────────────
// Role Utilities
// ─────────────────────────────────────────────

/**
 * Normalize a role string to UPPERCASE.
 * Handles legacy lowercase roles (superadmin, airport_admin, agent, viewer)
 * by converting them to the canonical UPPERCASE form.
 */
export function normalizeRole(role: string): Role {
  const upper = role.toUpperCase().replace(/-/g, '_')
  if (VALID_ROLES.includes(upper as Role)) {
    return upper as Role
  }
  // Fallback to VIEWER for unrecognised roles
  return 'VIEWER'
}

// ─────────────────────────────────────────────
// NextAuth-Based Authentication
// ─────────────────────────────────────────────

/**
 * Extract the authenticated user from the NextAuth session.
 *
 * This replaces the old Bearer-token-based `requireAuth()`.
 * It reads the HttpOnly cookie directly via `auth()`.
 *
 * The `request` parameter is accepted for backward compatibility
 * with existing route handlers that call `requireAuth(request)`.
 * It is NOT used — `auth()` reads cookies automatically in route handlers.
 */
export async function requireAuth(request?: unknown): Promise<AuthResult> {
  try {
    const session = await auth()

    if (!session?.user) {
      return {
        success: false,
        error: 'Authentication required',
        status: 401,
      }
    }

    // Check if user is active (stored in JWT token)
    const isActive = (session.user as Record<string, unknown>)?.isActive
    if (isActive === false) {
      return {
        success: false,
        error: 'Account is disabled. Contact an administrator.',
        status: 403,
      }
    }

    const sessionData = session.user as Record<string, unknown>
    const user: AuthUser = {
      id: String(sessionData?.userId || session.user.id || ''),
      email: session.user.email || '',
      name: session.user.name || '',
      role: normalizeRole(
        String(sessionData?.role || 'VIEWER'),
      ),
      airportCode: sessionData?.airportCode as string | undefined,
      partnerId: sessionData?.partnerId as string | undefined,
      partnerType: sessionData?.partnerType as string | undefined,
    }

    return { success: true, user }
  } catch (error) {
    console.error('[AUTH] requireAuth() failed:', error)
    return {
      success: false,
      error: 'Authentication check failed',
      status: 401,
    }
  }
}

/**
 * Role-based access control — checks NextAuth session + role.
 *
 * Usage (backward compatible):
 *   const authResult = await requireRole('superadmin', 'airport_admin')(request)
 *
 * The `request` parameter is accepted but ignored for backward compatibility.
 */
export function requireRole(...roles: string[]) {
  return async function (request?: unknown): Promise<AuthResult> {
    const authResult = await requireAuth(request)

    if (!authResult.success) {
      return authResult
    }

    if (!authResult.user) {
      return {
        success: false,
        error: 'User not found in session',
        status: 401,
      }
    }

    const userRoleUpper = authResult.user.role.toUpperCase()
    const allowedRoles = roles.map((r) => r.toUpperCase())

    if (!allowedRoles.includes(userRoleUpper)) {
      return {
        success: false,
        error: `Insufficient permissions. Required role: ${roles.join(' or ')}`,
        status: 403,
      }
    }

    return authResult
  }
}

/**
 * Airport-level access control — SUPERADMIN sees all, others restricted.
 *
 * Usage (backward compatible):
 *   const authResult = await requireAirportAccess(request, 'DSS')
 */
export async function requireAirportAccess(
  request: unknown,
  airportCode: string,
): Promise<AuthResult> {
  const authResult = await requireAuth(request)

  if (!authResult.success) {
    return authResult
  }

  if (!authResult.user) {
    return {
      success: false,
      error: 'User not found in session',
      status: 401,
    }
  }

  // SUPERADMIN has access to all airports
  if (authResult.user.role === 'SUPERADMIN') {
    return authResult
  }

  // PARTNER role: check via partnerId in session (not airportCode)
  if (authResult.user.role === 'PARTNER') {
    return authResult // partner-level filtering is applied at service layer
  }

  // Check if the admin manages this specific airport
  if (
    authResult.user.airportCode &&
    authResult.user.airportCode !== airportCode
  ) {
    return {
      success: false,
      error: `Access denied. You do not manage airport ${airportCode}`,
      status: 403,
    }
  }

  return authResult
}

/**
 * Partner-level access control — checks PARTNER role and optional partnerId ownership.
 * SUPERADMIN bypasses all checks. PARTNER users can optionally be scoped to their partnerId.
 *
 * Usage:
 *   const authResult = await requirePartnerAccess(request, optionalPartnerId)
 */
export async function requirePartnerAccess(
  request: unknown,
  partnerId?: string,
): Promise<AuthResult> {
  const authResult = await requireAuth(request)

  if (!authResult.success) {
    return authResult
  }

  if (!authResult.user) {
    return {
      success: false,
      error: 'User not found in session',
      status: 401,
    }
  }

  // SUPERADMIN has access to all partner data
  if (authResult.user.role === 'SUPERADMIN') {
    return authResult
  }

  // Must be PARTNER role
  if (authResult.user.role !== 'PARTNER') {
    return {
      success: false,
      error: 'Partner access required',
      status: 403,
    }
  }

  // If a specific partnerId is required, check ownership
  if (partnerId && authResult.user.partnerId && authResult.user.partnerId !== partnerId) {
    return {
      success: false,
      error: 'Access denied. You can only access your own partner data.',
      status: 403,
    }
  }

  return authResult
}

// ─────────────────────────────────────────────
// JWT Utilities (kept for login/refresh API endpoints)
// ─────────────────────────────────────────────
// Used by /api/auth/login and /api/auth/refresh for JWT token generation.
// Dashboard authentication uses NextAuth v5 (cookie-based) exclusively.

import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.warn('[AUTH] JWT_SECRET is not set. Login/refresh tokens will not work.')
}

function getJwtSecret(): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured')
  return JWT_SECRET
}

export function generateToken(user: AuthUser): string {
  const payload: Record<string, unknown> = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    airportCode: user.airportCode,
  }
  if (user.partnerId) payload.partnerId = user.partnerId
  if (user.partnerType) payload.partnerType = user.partnerType
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '24h' })
}

export function generateRefreshToken(userId: string): string {
  const payload = { id: userId, type: 'refresh' }
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' })
}

export function verifyRefreshToken(token: string): AuthResult {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string; type: string }
    if (decoded.type !== 'refresh') {
      return { success: false, error: 'Invalid refresh token', status: 401 }
    }
    return { success: true, user: { id: decoded.id, email: '', name: '', role: 'VIEWER' } }
  } catch {
    return { success: false, error: 'Invalid refresh token', status: 401 }
  }
}
