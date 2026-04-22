import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import crypto from 'crypto'

// ─────────────────────────────────────────────
// Partners
// ─────────────────────────────────────────────

/**
 * Get all partners, optionally filtered by airport and type.
 */
export async function getPartners(airportCode?: string, type?: string) {
  const where: Record<string, unknown> = { isActive: true }

  if (airportCode) {
    where.airportCode = airportCode
  }
  if (type) {
    where.type = type
  }

  return db.partner.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
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
}

/**
 * Get a single partner by ID.
 */
export async function getPartnerById(id: string) {
  return db.partner.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLogin: true,
        },
      },
    },
  })
}

/**
 * Create a partner (superadmin/airport_admin).
 */
export async function createPartner(data: {
  airportCode: string
  type: string
  name: string
  email: string
  phone: string
  contactPerson: string
  commissionRate?: number
  contractStart: string
  contractEnd?: string
  logoUrl?: string
}) {
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
  } = data

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
    },
  })
}

/**
 * Update a partner.
 */
export async function updatePartner(
  id: string,
  data: Partial<{
    airportCode: string
    type: string
    name: string
    email: string
    phone: string
    contactPerson: string
    commissionRate: number
    contractStart: string
    contractEnd: string
    logoUrl: string
    isActive: boolean
  }>
) {
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
  if (data.isActive !== undefined) updateData.isActive = data.isActive

  return db.partner.update({
    where: { id },
    data: updateData,
  })
}

/**
 * Deactivate a partner (soft delete).
 */
export async function deactivatePartner(id: string) {
  return db.partner.update({
    where: { id },
    data: { isActive: false },
  })
}

// ─────────────────────────────────────────────
// Partner Users
// ─────────────────────────────────────────────

/**
 * Invite a user to a partner.
 * Generates a random password, hashes it, and returns the plain password for email delivery.
 */
export async function invitePartnerUser(
  partnerId: string,
  data: {
    email: string
    name: string
    role?: string // agent or manager
  }
) {
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

  // Generate a random password (12 chars)
  const plainPassword = crypto.randomBytes(8).toString('hex') // 16 hex chars
  const passwordHash = hashPassword(plainPassword)

  // Create the partner user
  const user = await db.partnerUser.create({
    data: {
      partnerId,
      email: data.email,
      name: data.name,
      password: passwordHash,
      role: data.role || 'agent',
    },
  })

  // Return the user without the password hash, plus the plain password for the email
  const { password: _password, ...userWithoutPassword } = user

  return {
    user: userWithoutPassword,
    plainPassword,
  }
}

/**
 * Get all users for a partner.
 */
export async function getPartnerUsers(partnerId: string) {
  return db.partnerUser.findMany({
    where: { partnerId },
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
  })
}
