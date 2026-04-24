// ─────────────────────────────────────────────
// Role-Based Access Control Utilities
// ─────────────────────────────────────────────

export type RoleType = 'SUPERADMIN' | 'AIRPORT_ADMIN' | 'AGENT' | 'VIEWER'

export const ROLES: Record<RoleType, number> = {
  SUPERADMIN: 4,
  AIRPORT_ADMIN: 3,
  AGENT: 2,
  VIEWER: 1,
} as const

/**
 * Check if a user's role meets or exceeds the required role level.
 * SUPERADMIN > AIRPORT_ADMIN > AGENT > VIEWER
 */
export function hasRole(userRole: string, requiredRole: RoleType): boolean {
  const userLevel = ROLES[userRole as RoleType]
  const requiredLevel = ROLES[requiredRole]
  if (userLevel === undefined || requiredLevel === undefined) return false
  return userLevel >= requiredLevel
}

/**
 * Check if a user can access a specific airport's data.
 * SUPERADMIN can access all airports, others only their own.
 */
export function canAccessAirport(
  userRole: string,
  userAirportCode: string | null | undefined,
  targetAirportCode: string | null | undefined
): boolean {
  // SUPERADMIN has access to all airports
  if (userRole === 'SUPERADMIN') return true

  // If no specific airport is being targeted, allow access
  if (!targetAirportCode) return true

  // User must have an assigned airport that matches
  if (!userAirportCode) return false

  return userAirportCode === targetAirportCode
}

// ─────────────────────────────────────────────
// Session Types
// ─────────────────────────────────────────────

export interface SmartlyUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  role: RoleType
  airportCode?: string | null
  isActive: boolean
  userId?: string
}

export interface SmartlySession {
  user: SmartlyUser
  expires: string
}
