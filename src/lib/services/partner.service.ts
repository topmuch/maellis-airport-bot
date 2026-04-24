import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const JWT_SECRET: string = process.env.JWT_SECRET!
if (!process.env.JWT_SECRET) {
  throw new Error('[SECURITY] JWT_SECRET is required for partner service. Set it in .env')
}
const INVITE_TOKEN_EXPIRES_IN = '7d'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type PartnerType = 'TRAVEL_AGENCY' | 'AIRLINE' | 'SERVICE_PROVIDER'
type PartnerStatus = 'pending' | 'active' | 'inactive'

interface CreatePartnerInput {
  airportCode: string
  type: PartnerType | string
  name: string
  email: string
  phone: string
  contactPerson: string
  commissionRate?: number
  contractStart: string
  contractEnd?: string
  logoUrl?: string
  notes?: string
}

interface UpdatePartnerInput {
  airportCode?: string
  type?: string
  name?: string
  email?: string
  phone?: string
  contactPerson?: string
  commissionRate?: number
  contractStart?: string
  contractEnd?: string
  logoUrl?: string
  notes?: string
  isActive?: boolean
  status?: string
}

interface InvitePartnerInput {
  airportCode: string
  type: PartnerType | string
  name: string
  email: string
  phone: string
  contactPerson: string
  commissionRate?: number
  contractStart?: string
  contractEnd?: string
  logoUrl?: string
  notes?: string
}

interface ActivatePartnerForm {
  name: string
  password: string
  phone?: string
}

interface InviteUserInput {
  email: string
  name: string
  role?: string
}

interface CommissionResult {
  partnerId: string
  month: string
  transportBookings: number
  loungeBookings: number
  totalBookings: number
  totalRevenue: number
  totalCommission: number
  commissionRate: number
  details: {
    transport: { count: number; revenue: number; commission: number }
    lounge: { count: number; revenue: number; commission: number }
  }
}

interface VerifyTokenResult {
  valid: boolean
  decoded?: {
    partnerId: string
    email: string
    type: string
    iat?: number
    exp?: number
  }
  error?: string
}

// ─────────────────────────────────────────────
// 1. getPartners — List partners with filters
// ─────────────────────────────────────────────

/**
 * List partners with users count, filtered by airportCode, type, and/or status.
 * Always filters by isActive=true unless all statuses are requested.
 */
export async function getPartners(
  airportCode?: string,
  type?: string,
  status?: string
) {
  try {
    const where: Record<string, unknown> = {}

    // If no status filter provided, default to active partners
    if (status) {
      where.status = status
    } else {
      where.isActive = true
    }

    if (airportCode) {
      where.airportCode = airportCode
    }
    if (type) {
      where.type = type
    }

    const partners = await db.partner.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { users: true },
        },
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
          },
        },
      },
    })

    // Attach usersCount for convenience
    return partners.map((partner) => ({
      ...partner,
      usersCount: partner._count.users,
    }))
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[partner.service] Error in getPartners:', error)
    }
    throw error
  }
}

// ─────────────────────────────────────────────
// 2. getPartnerById — Get partner with users
// ─────────────────────────────────────────────

/**
 * Get a single partner by ID with its users.
 */
export async function getPartnerById(id: string) {
  try {
    const partner = await db.partner.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!partner) return null

    return {
      ...partner,
      usersCount: partner._count.users,
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[partner.service] Error in getPartnerById:', error)
    }
    throw error
  }
}

// ─────────────────────────────────────────────
// 3. createPartner — Admin creates partner
// ─────────────────────────────────────────────

/**
 * Admin creates a partner with all fields.
 * Status is set to 'pending', isActive=false.
 */
export async function createPartner(data: CreatePartnerInput) {
  try {
    const {
      airportCode,
      type,
      name,
      email,
      phone,
      contactPerson,
      commissionRate,
      contractStart,
      contractEnd,
      logoUrl,
      notes,
    } = data

    // Check for existing partner with same email
    const existingByEmail = await db.partner.findUnique({
      where: { email },
    })
    if (existingByEmail) {
      throw new Error('A partner with this email already exists')
    }

    // Check for existing partner with same airportCode + name
    const existingByName = await db.partner.findFirst({
      where: { airportCode, name },
    })
    if (existingByName) {
      throw new Error('A partner with this name already exists at this airport')
    }

    return db.partner.create({
      data: {
        airportCode,
        type,
        name,
        email,
        phone,
        contactPerson,
        commissionRate: commissionRate ?? 0.10,
        contractStart: new Date(contractStart),
        contractEnd: contractEnd ? new Date(contractEnd) : null,
        logoUrl: logoUrl || null,
        notes: notes || null,
        status: 'pending',
        isActive: false,
      },
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[partner.service] Error in createPartner:', error)
    }
    throw error
  }
}

// ─────────────────────────────────────────────
// 4. updatePartner — Update any field
// ─────────────────────────────────────────────

/**
 * Update any field on an existing partner.
 */
export async function updatePartner(id: string, data: UpdatePartnerInput) {
  try {
    // Verify partner exists
    const existing = await db.partner.findUnique({ where: { id } })
    if (!existing) {
      throw new Error('Partner not found')
    }

    // If email is being changed, check uniqueness
    if (data.email && data.email !== existing.email) {
      const emailTaken = await db.partner.findUnique({
        where: { email: data.email },
      })
      if (emailTaken) {
        throw new Error('A partner with this email already exists')
      }
    }

    const updateData: Record<string, unknown> = {}

    if (data.airportCode !== undefined) updateData.airportCode = data.airportCode
    if (data.type !== undefined) updateData.type = data.type
    if (data.name !== undefined) updateData.name = data.name
    if (data.email !== undefined) updateData.email = data.email
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson
    if (data.commissionRate !== undefined) updateData.commissionRate = data.commissionRate
    if (data.contractStart !== undefined) updateData.contractStart = new Date(data.contractStart)
    if (data.contractEnd !== undefined) updateData.contractEnd = data.contractEnd ? new Date(data.contractEnd) : null
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.status !== undefined) updateData.status = data.status

    return db.partner.update({
      where: { id },
      data: updateData,
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[partner.service] Error in updatePartner:', error)
    }
    throw error
  }
}

// ─────────────────────────────────────────────
// 5. deactivatePartner — Soft deactivation
// ─────────────────────────────────────────────

/**
 * Deactivate a partner: set isActive=false and status='inactive'.
 */
export async function deactivatePartner(id: string) {
  try {
    const existing = await db.partner.findUnique({ where: { id } })
    if (!existing) {
      throw new Error('Partner not found')
    }

    if (!existing.isActive && existing.status === 'inactive') {
      throw new Error('Partner is already inactive')
    }

    return db.partner.update({
      where: { id },
      data: {
        isActive: false,
        status: 'inactive',
      },
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[partner.service] Error in deactivatePartner:', error)
    }
    throw error
  }
}

// ─────────────────────────────────────────────
// 6. invitePartner — THE KEY FUNCTION
// ─────────────────────────────────────────────

/**
 * Create a partner with status='pending', isActive=false,
 * generate a JWT invite token, save it in DB, and return both
 * the partner record and the invite token.
 */
export async function invitePartner(partnerData: InvitePartnerInput) {
  try {
    const {
      airportCode,
      type,
      name,
      email,
      phone,
      contactPerson,
      commissionRate,
      contractStart,
      contractEnd,
      logoUrl,
      notes,
    } = partnerData

    // Check for existing partner with same email
    const existingByEmail = await db.partner.findUnique({
      where: { email },
    })
    if (existingByEmail) {
      throw new Error('A partner with this email already exists')
    }

    // Check for existing partner with same airportCode + name
    const existingByName = await db.partner.findFirst({
      where: { airportCode, name },
    })
    if (existingByName) {
      throw new Error('A partner with this name already exists at this airport')
    }

    // Create partner in pending state
    const partner = await db.partner.create({
      data: {
        airportCode,
        type,
        name,
        email,
        phone,
        contactPerson,
        commissionRate: commissionRate ?? 0.10,
        contractStart: contractStart ? new Date(contractStart) : new Date(),
        contractEnd: contractEnd ? new Date(contractEnd) : null,
        logoUrl: logoUrl || null,
        notes: notes || null,
        status: 'pending',
        isActive: false,
        inviteToken: null, // Will be set below
      },
    })

    // Generate JWT invite token
    const inviteToken = jwt.sign(
      {
        partnerId: partner.id,
        email: partner.email,
        type: partner.type,
      },
      JWT_SECRET,
      { expiresIn: INVITE_TOKEN_EXPIRES_IN }
    )

    // Save the invite token in DB
    await db.partner.update({
      where: { id: partner.id },
      data: { inviteToken },
    })

    // Return partner with inviteToken attached
    return {
      partner: {
        ...partner,
        inviteToken,
      },
      inviteToken,
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[partner.service] Error in invitePartner:', error)
    }
    throw error
  }
}

// ─────────────────────────────────────────────
// 7. activatePartner — Activation flow
// ─────────────────────────────────────────────

/**
 * Activate a partner from an invite token:
 *  1. Verify JWT token
 *  2. Find partner by ID from token
 *  3. Verify token matches partner.inviteToken
 *  4. Hash password, create PartnerUser with role='admin'
 *  5. Set partner: status='active', isActive=true, activatedAt=now()
 *  6. Clear inviteToken
 */
export async function activatePartner(token: string, formData: ActivatePartnerForm) {
  try {
    const { name, password, phone } = formData

    if (!name || !password) {
      throw new Error('Name and password are required')
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long')
    }

    // Step 1: Verify JWT token
    let decoded: { partnerId: string; email: string; type: string }
    try {
      decoded = jwt.verify(token, JWT_SECRET) as {
        partnerId: string
        email: string
        type: string
      }
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw new Error('Invitation token has expired. Please request a new invitation.')
      }
      if (jwtError instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid invitation token.')
      }
      throw new Error('Token verification failed.')
    }

    // Step 2: Find partner by ID from token
    const partner = await db.partner.findUnique({
      where: { id: decoded.partnerId },
    })

    if (!partner) {
      throw new Error('Partner not found. The invitation may be invalid.')
    }

    // Step 3: Verify token matches partner.inviteToken
    if (!partner.inviteToken) {
      throw new Error('No invitation token found for this partner. The partner may already be activated.')
    }

    if (partner.inviteToken !== token) {
      throw new Error('Token mismatch. The invitation token does not match the one on record.')
    }

    // Check if already active
    if (partner.isActive && partner.status === 'active') {
      throw new Error('This partner has already been activated.')
    }

    // Step 4: Hash password and create PartnerUser with role='admin'
    const passwordHash = hashPassword(password)

    const adminUser = await db.partnerUser.create({
      data: {
        partnerId: partner.id,
        email: partner.email,
        name,
        password: passwordHash,
        phone: phone || '',
        role: 'admin',
        isActive: true,
      },
    })

    // Step 5: Set partner as active
    await db.partner.update({
      where: { id: partner.id },
      data: {
        status: 'active',
        isActive: true,
        activatedAt: new Date(),
        inviteToken: null, // Step 6: Clear inviteToken
      },
    })

    // Return success — exclude password from response
    const { password: _, ...userWithoutPassword } = adminUser

    return {
      success: true,
      message: 'Partner activated successfully',
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        type: partner.type,
        airportCode: partner.airportCode,
      },
      user: userWithoutPassword,
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[partner.service] Error in activatePartner:', error)
    }
    throw error
  }
}

// ─────────────────────────────────────────────
// 8. getPartnerUsers — List users for a partner
// ─────────────────────────────────────────────

/**
 * Get all users for a specific partner.
 */
export async function getPartnerUsers(partnerId: string) {
  try {
    // Verify partner exists
    const partner = await db.partner.findUnique({
      where: { id: partnerId },
    })

    if (!partner) {
      throw new Error('Partner not found')
    }

    return db.partnerUser.findMany({
      where: { partnerId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        phone: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[partner.service] Error in getPartnerUsers:', error)
    }
    throw error
  }
}

// ─────────────────────────────────────────────
// 9. invitePartnerUser — Invite user to partner
// ─────────────────────────────────────────────

/**
 * Invite a user to an existing partner.
 * Generates a random password, hashes it, creates the user,
 * and returns the plain password for email delivery.
 */
export async function invitePartnerUser(
  partnerId: string,
  data: InviteUserInput
) {
  try {
    const { email, name, role } = data

    // Verify partner exists and is active
    const partner = await db.partner.findUnique({
      where: { id: partnerId },
    })

    if (!partner) {
      throw new Error('Partner not found')
    }

    if (!partner.isActive) {
      throw new Error('Cannot invite users to an inactive partner')
    }

    // Validate role
    const validRoles = ['agent', 'manager', 'admin']
    const userRole = role || 'agent'
    if (!validRoles.includes(userRole)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`)
    }

    // Check if email is already taken (globally unique)
    const existingUser = await db.partnerUser.findUnique({
      where: { email },
    })
    if (existingUser) {
      throw new Error('A user with this email already exists')
    }

    // Generate a random password (16 hex characters = secure enough for initial setup)
    const plainPassword = crypto.randomBytes(10).toString('hex') // 20 chars
    const passwordHash = hashPassword(plainPassword)

    // Create the partner user
    const user = await db.partnerUser.create({
      data: {
        partnerId,
        email,
        name,
        password: passwordHash,
        phone: '',
        role: userRole,
        isActive: true,
      },
    })

    // Return the user without the password hash, plus the plain password for email
    const { password: _password, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword,
      plainPassword,
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[partner.service] Error in invitePartnerUser:', error)
    }
    throw error
  }
}

// ─────────────────────────────────────────────
// 10. getPartnerCommissions — Calculate commissions
// ─────────────────────────────────────────────

/**
 * Calculate commissions for a partner for a given month.
 * Counts completed transport/lounge bookings at the partner's airport,
 * and sums commissionRate * totalPrice.
 *
 * NOTE: Currently attributes all completed bookings at the partner's airport.
 * Future enhancement: add partnerId to TransportBooking/LoungeBooking models
 * for direct attribution.
 */
export async function getPartnerCommissions(
  partnerId: string,
  month?: string
) {
  try {
    // Verify partner exists
    const partner = await db.partner.findUnique({
      where: { id: partnerId },
    })

    if (!partner) {
      throw new Error('Partner not found')
    }

    // Parse month filter — format: "YYYY-MM" or default to current month
    const now = new Date()
    let startDate: Date
    let endDate: Date

    if (month) {
      const [year, mon] = month.split('-').map(Number)
      if (!year || !mon || mon < 1 || mon > 12) {
        throw new Error('Invalid month format. Use YYYY-MM.')
      }
      startDate = new Date(year, mon - 1, 1)
      endDate = new Date(year, mon, 1) // First day of next month
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    }

    const monthLabel = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Fetch completed transport bookings for this airport in the month range
    const transportBookings = await db.transportBooking.findMany({
      where: {
        status: 'completed',
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
        // Attribute by the partner's airport code
        provider: {
          airportCode: partner.airportCode,
        },
      },
      select: {
        id: true,
        totalPrice: true,
      },
    })

    // Fetch completed lounge bookings for this airport in the month range
    const loungeBookings = await db.loungeBooking.findMany({
      where: {
        status: 'completed',
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
        airportCode: partner.airportCode,
      },
      select: {
        id: true,
        totalPrice: true,
      },
    })

    // Calculate totals
    const transportRevenue = transportBookings.reduce((sum, b) => sum + b.totalPrice, 0)
    const loungeRevenue = loungeBookings.reduce((sum, b) => sum + b.totalPrice, 0)
    const totalRevenue = transportRevenue + loungeRevenue

    const transportCommission = transportRevenue * partner.commissionRate
    const loungeCommission = loungeRevenue * partner.commissionRate
    const totalCommission = totalRevenue * partner.commissionRate

    const result: CommissionResult = {
      partnerId: partner.id,
      month: monthLabel,
      transportBookings: transportBookings.length,
      loungeBookings: loungeBookings.length,
      totalBookings: transportBookings.length + loungeBookings.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCommission: Math.round(totalCommission * 100) / 100,
      commissionRate: partner.commissionRate,
      details: {
        transport: {
          count: transportBookings.length,
          revenue: Math.round(transportRevenue * 100) / 100,
          commission: Math.round(transportCommission * 100) / 100,
        },
        lounge: {
          count: loungeBookings.length,
          revenue: Math.round(loungeRevenue * 100) / 100,
          commission: Math.round(loungeCommission * 100) / 100,
        },
      },
    }

    return result
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[partner.service] Error in getPartnerCommissions:', error)
    }
    throw error
  }
}

// ─────────────────────────────────────────────
// 11. verifyInviteToken — Verify JWT without activating
// ─────────────────────────────────────────────

/**
 * Verify a JWT invite token and return the decoded data
 * without activating the partner. Useful for pre-filling
 * activation forms and checking token validity.
 */
export async function verifyInviteToken(token: string): Promise<VerifyTokenResult> {
  try {
    // Step 1: Verify JWT token
    let decoded: { partnerId: string; email: string; type: string; iat?: number; exp?: number }
    try {
      decoded = jwt.verify(token, JWT_SECRET) as typeof decoded
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: 'Invitation token has expired. Please request a new invitation.',
        }
      }
      if (jwtError instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: 'Invalid invitation token.',
        }
      }
      return {
        valid: false,
        error: 'Token verification failed.',
      }
    }

    // Step 2: Find partner by ID from token
    const partner = await db.partner.findUnique({
      where: { id: decoded.partnerId },
    })

    if (!partner) {
      return {
        valid: false,
        error: 'Partner not found. The invitation may be invalid.',
      }
    }

    // Step 3: Verify token matches partner.inviteToken
    if (!partner.inviteToken) {
      return {
        valid: false,
        error: 'No invitation token found. The partner may already be activated.',
      }
    }

    if (partner.inviteToken !== token) {
      return {
        valid: false,
        error: 'Token mismatch. The invitation token does not match the one on record.',
      }
    }

    // Step 4: Check if already active
    if (partner.isActive && partner.status === 'active') {
      return {
        valid: false,
        error: 'This partner has already been activated.',
      }
    }

    return {
      valid: true,
      decoded: {
        partnerId: decoded.partnerId,
        email: decoded.email,
        type: decoded.type,
        iat: decoded.iat,
        exp: decoded.exp,
      },
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[partner.service] Error in verifyInviteToken:', error)
    }
    return {
      valid: false,
      error: 'An unexpected error occurred while verifying the token.',
    }
  }
}
