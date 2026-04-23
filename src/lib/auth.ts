import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'superadmin' | 'airport_admin' | 'agent' | 'viewer'
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

const JWT_SECRET = process.env.JWT_SECRET || 'maellis-dev-secret'
const ACCESS_TOKEN_EXPIRES_IN = '24h'
const REFRESH_TOKEN_EXPIRES_IN = '7d'

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

export function generateToken(user: AuthUser): string {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    airportCode: user.airportCode,
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  })
}

export function generateRefreshToken(userId: string): string {
  const payload = {
    id: userId,
    type: 'refresh',
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  })
}

// ─────────────────────────────────────────────
// Token Verification
// ─────────────────────────────────────────────

export function verifyToken(token: string): AuthResult {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
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
      role: decoded.role as AuthUser['role'],
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
    const decoded = jwt.verify(token, JWT_SECRET) as {
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
        role: 'viewer',
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

    if (!roles.includes(authResult.user.role)) {
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

  // Superadmin has access to all airports
  if (authResult.user.role === 'superadmin') {
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
