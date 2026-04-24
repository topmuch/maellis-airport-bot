import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

// Canonical (UPPERCASE) roles — matches NextAuth v5 and role-guard.ts
export const VALID_ROLES = ['SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT', 'VIEWER'] as const
export type Role = (typeof VALID_ROLES)[number]

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  airportCode?: string
}

export interface AuthResult {
  success: boolean
  user?: AuthUser
  error?: string
  status?: number
}

// ─────────────────────────────────────────────
// JWT Configuration
// ─────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.warn('[AUTH] JWT_SECRET is not set. Legacy JWT endpoints will not work. Set it in .env')
}
const ACCESS_TOKEN_EXPIRES_IN = '24h'
const REFRESH_TOKEN_EXPIRES_IN = '7d'

function getJwtSecret(): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured')
  return JWT_SECRET
}

// ─────────────────────────────────────────────
// Password Utilities
// ─────────────────────────────────────────────

const SALT_ROUNDS = 12

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS)
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash)
}

// ─────────────────────────────────────────────
// Token Generation
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

export function generateToken(user: AuthUser): string {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    airportCode: user.airportCode,
  }

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  })
}

export function generateRefreshToken(userId: string): string {
  const payload = {
    id: userId,
    type: 'refresh',
  }

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  })
}

// ─────────────────────────────────────────────
// Token Verification
// ─────────────────────────────────────────────

export function verifyToken(token: string): AuthResult {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      id: string
      email: string
      name: string
      role: string
      airportCode?: string
      type?: string
    }

    // Reject refresh tokens used as access tokens
    if (decoded.type === 'refresh') {
      return {
        success: false,
        error: 'Invalid token type',
        status: 401,
      }
    }

    const user: AuthUser = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: normalizeRole(decoded.role),
      airportCode: decoded.airportCode,
    }

    return {
      success: true,
      user,
    }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        error: 'Token expired',
        status: 401,
      }
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        error: 'Invalid token',
        status: 401,
      }
    }
    return {
      success: false,
      error: 'Token verification failed',
      status: 401,
    }
  }
}

export function verifyRefreshToken(token: string): AuthResult {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      id: string
      type: string
    }

    // Must be a refresh token
    if (decoded.type !== 'refresh') {
      return {
        success: false,
        error: 'Invalid refresh token',
        status: 401,
      }
    }

    return {
      success: true,
      user: {
        id: decoded.id,
        email: '',
        name: '',
        role: 'VIEWER',
      },
    }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        error: 'Refresh token expired',
        status: 401,
      }
    }
    return {
      success: false,
      error: 'Invalid refresh token',
      status: 401,
    }
  }
}

// ─────────────────────────────────────────────
// Request Helpers
// ─────────────────────────────────────────────

export function getUserFromRequest(request: NextRequest): AuthResult {
  const authHeader = request.headers.get('authorization')

  if (!authHeader) {
    return {
      success: false,
      error: 'Missing Authorization header',
      status: 401,
    }
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return {
      success: false,
      error: 'Invalid Authorization header format. Expected: Bearer <token>',
      status: 401,
    }
  }

  const token = parts[1]
  if (!token) {
    return {
      success: false,
      error: 'Empty Bearer token',
      status: 401,
    }
  }

  return verifyToken(token)
}

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const result = getUserFromRequest(request)
  if (!result.success) {
    return result
  }
  return result
}

// ─────────────────────────────────────────────
// Role-Based Access Control
// ─────────────────────────────────────────────

export function requireRole(...roles: string[]) {
  return async function (request: NextRequest): Promise<AuthResult> {
    const authResult = await requireAuth(request)

    if (!authResult.success) {
      return authResult
    }

    if (!authResult.user) {
      return {
        success: false,
        error: 'User not found in token',
        status: 401,
      }
    }

    const userRoleUpper = authResult.user.role.toUpperCase()
    const allowedRoles = roles.map(r => r.toUpperCase())

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

// ─────────────────────────────────────────────
// Airport Access Control
// ─────────────────────────────────────────────

export async function requireAirportAccess(
  request: NextRequest,
  airportCode: string
): Promise<AuthResult> {
  const authResult = await requireAuth(request)

  if (!authResult.success) {
    return authResult
  }

  if (!authResult.user) {
    return {
      success: false,
      error: 'User not found in token',
      status: 401,
    }
  }

  // SUPERADMIN has access to all airports
  if (authResult.user.role === 'SUPERADMIN') {
    return authResult
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

  // Users without an assigned airport code can access any airport
  // (this can be tightened based on business requirements)
  return authResult
}
