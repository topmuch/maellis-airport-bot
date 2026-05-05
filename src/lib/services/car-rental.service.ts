import { db } from '@/lib/db'
import { z } from 'zod'

// ═══════════════════════════════════════════════════════════════
// MAELLIS Airport Bot — Car Rental Service
// Full business logic for car rental partners, vehicles & bookings
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// Validation Helpers
// ─────────────────────────────────────────────

/** Validate a non-negative finite number (must be >= 0) */
function validateNonNegative(value: unknown, fieldName: string): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${fieldName} must be a non-negative number`)
  }
  return n
}

/** Validate a positive finite number (must be > 0) */
function validatePositive(value: unknown, fieldName: string): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${fieldName} must be a positive number`)
  }
  return n
}

/** Validate a positive finite integer */
function validatePositiveInteger(value: unknown, fieldName: string, min = 1): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < min || Math.floor(n) !== n) {
    throw new Error(`${fieldName} must be an integer >= ${min}`)
  }
  return n
}

/** Validate phone format */
function validatePhone(phone: unknown, fieldName = 'phone'): string {
  if (typeof phone !== 'string' || !/^[+\d\s\-()]{6,20}$/.test(phone.trim())) {
    throw new Error(`Invalid ${fieldName}: must be 6-20 characters and contain only digits, spaces, +, -, ()`)
  }
  return phone.trim()
}

/** Wrap error to prevent internal details from leaking */
function safeError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (process.env.NODE_ENV === 'development') {
    console.error(`[car-rental] ${context}:`, message)
  }
  if (error instanceof Error) {
    return new Error(error.message.includes('Prisma') ? 'Database error' : error.message)
  }
  return new Error('An unexpected error occurred')
}

// ─────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────

/** Data to create a new car rental partner */
export interface CreatePartnerData {
  name: string
  terminal: string
  contactPhone: string
  contactEmail?: string
  commissionRate?: number
}

/** Data to update an existing car rental partner (partial) */
export interface UpdatePartnerData {
  name?: string
  terminal?: string
  contactPhone?: string
  contactEmail?: string | null
  isActive?: boolean
  commissionRate?: number
}

/** Data to create a new vehicle */
export interface CreateVehicleData {
  partnerId: string
  category: string
  brand: string
  model: string
  seats: number
  transmission: string
  ac?: boolean
  pricePerDay: number
  currency?: string
  imageUrl?: string
}

/** Data to update an existing vehicle (partial) */
export interface UpdateVehicleData {
  category?: string
  brand?: string
  model?: string
  seats?: number
  transmission?: string
  ac?: boolean
  pricePerDay?: number
  currency?: string
  imageUrl?: string | null
  isAvailable?: boolean
}

/** Data to create a new car booking */
export interface CreateBookingData {
  vehicleId: string
  userPhone: string
  userName?: string
  pickupDate: string
  dropoffDate: string
  pickupLocation: string
  insurance?: boolean
  childSeat?: boolean
  currency?: string
}

/** Price breakdown returned by calculateTotalPrice */
export interface PriceBreakdown {
  days: number
  rentalPrice: number
  insuranceCost: number
  childSeatCost: number
  totalPrice: number
  currency: string
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

export const VEHICLE_CATEGORIES = ['Eco', 'Comfort', 'SUV', 'Van', 'Luxury'] as const
export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number]

export const TRANSMISSION_TYPES = ['Manual', 'Automatic'] as const
export type TransmissionType = (typeof TRANSMISSION_TYPES)[number]

export const BOOKING_STATUSES = [
  'pending_payment',
  'paid',
  'confirmed',
  'active',
  'completed',
  'cancelled',
] as const
export type CarBookingStatus = (typeof BOOKING_STATUSES)[number]

export const INSURANCE_COST = 2000
export const CHILD_SEAT_COST = 1500

// ─── Zod Validation Schemas ──────────────────────────────────────────────

const vehicleCategoryEnum = z.enum(VEHICLE_CATEGORIES)
const transmissionTypeEnum = z.enum(TRANSMISSION_TYPES)
const bookingStatusEnum = z.enum(BOOKING_STATUSES)
const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d{3})?Z?)?$/

const createPartnerSchema = z.object({
  name: z.string().min(1, 'name is required').max(200, 'name must be at most 200 characters'),
  terminal: z.string().min(1, 'terminal is required').max(50),
  contactPhone: z.string().min(6, 'contactPhone is required').max(20),
  contactEmail: z.string().email('Invalid email format').optional(),
  commissionRate: z.coerce.number().min(0).max(1).default(0.10),
})

const updatePartnerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  terminal: z.string().min(1).max(50).optional(),
  contactPhone: z.string().min(6).max(20).optional(),
  contactEmail: z.string().email('Invalid email format').nullable().optional(),
  isActive: z.boolean().optional(),
  commissionRate: z.coerce.number().min(0).max(1).optional(),
})

const createVehicleSchema = z.object({
  partnerId: z.string().min(1, 'partnerId is required'),
  category: vehicleCategoryEnum,
  brand: z.string().min(1, 'brand is required').max(100),
  model: z.string().min(1, 'model is required').max(100),
  seats: z.coerce.number().int().min(1).max(20),
  transmission: transmissionTypeEnum,
  ac: z.boolean().default(true),
  pricePerDay: z.coerce.number().positive('pricePerDay must be positive'),
  currency: z.string().max(10).default('XOF'),
  imageUrl: z.string().url().optional().nullable(),
})

const updateVehicleSchema = z.object({
  category: vehicleCategoryEnum.optional(),
  brand: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(100).optional(),
  seats: z.coerce.number().int().min(1).max(20).optional(),
  transmission: transmissionTypeEnum.optional(),
  ac: z.boolean().optional(),
  pricePerDay: z.coerce.number().positive().optional(),
  currency: z.string().max(10).optional(),
  imageUrl: z.string().url().nullable().optional(),
  isAvailable: z.boolean().optional(),
})

const createBookingSchema = z.object({
  vehicleId: z.string().min(1, 'vehicleId is required'),
  userPhone: z.string().min(6, 'userPhone is required'),
  userName: z.string().max(200).optional(),
  pickupDate: z.string().regex(isoDateRegex, 'pickupDate must be a valid ISO date'),
  dropoffDate: z.string().regex(isoDateRegex, 'dropoffDate must be a valid ISO date'),
  pickupLocation: z.string().min(1, 'pickupLocation is required').max(300),
  insurance: z.boolean().default(false),
  childSeat: z.boolean().default(false),
  currency: z.string().max(10).default('XOF'),
})

const paymentCallbackSchema = z.object({
  paymentRef: z.string().min(1, 'paymentRef is required'),
  status: z.string().default('paid'),
})

const statusUpdateSchema = z.object({
  status: z.enum(['confirmed', 'active', 'completed', 'cancelled']),
})

// ─────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────

/**
 * Generate a confirmation code in the format "SM-ART-XXXX".
 * Uses unambiguous character set (no I, O, 0, 1).
 */
function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `SM-ART-${code}`
}

/**
 * Generate a unique confirmation code, retrying on collision (max 5).
 * Falls back to a timestamp-based code if all random codes collide.
 */
async function generateUniqueConfirmationCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateConfirmationCode()
    const existing = await db.carBooking.findUnique({ where: { confirmationCode: code } })
    if (!existing) return code
  }
  return `SM-ART-${Date.now().toString(36).toUpperCase().slice(-4)}`
}

/**
 * Calculate the number of days between two dates (ceil to account for partial days).
 */
function calculateDays(pickupDate: Date, dropoffDate: Date): number {
  const diffMs = dropoffDate.getTime() - pickupDate.getTime()
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(days, 1)
}

// ═══════════════════════════════════════════════════════════════
// 1. PARTNER CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * Get a single car rental partner by ID.
 */
export async function getPartnerById(id: string) {
  try {
    console.log('[car-rental] getPartnerById called', { id })
    return db.carRentalPartner.findUnique({
      where: { id },
      include: {
        _count: { select: { Vehicle: true, CarBooking: true } },
      },
    })
  } catch (error) {
    throw safeError(error, 'getPartnerById')
  }
}

/**
 * Soft-delete a car rental partner by setting isActive = false.
 */
export async function deletePartner(id: string) {
  try {
    const partner = await db.carRentalPartner.findUnique({ where: { id } })
    if (!partner) {
      throw new Error('Car rental partner not found')
    }

    if (!partner.isActive) {
      return partner
    }

    console.log('[car-rental] deletePartner (soft) called', { id })

    return db.carRentalPartner.update({
      where: { id },
      data: { isActive: false },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Car rental partner not found') {
      throw error
    }
    throw safeError(error, 'deletePartner')
  }
}

/**
 * List car rental partners, optionally filtered by activeOnly.
 */
export async function getPartners(activeOnly: boolean = true) {
  try {
    const where: Record<string, unknown> = {}
    if (activeOnly) {
      where.isActive = true
    }

    console.log('[car-rental] getPartners called')

    return db.carRentalPartner.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { Vehicle: true, CarBooking: true } },
      },
    })
  } catch (error) {
    throw safeError(error, 'getPartners')
  }
}

/**
 * Create a new car rental partner.
 */
export async function createPartner(data: CreatePartnerData) {
  try {
    const parsed = createPartnerSchema.safeParse(data)
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`)
    }
    const validatedData = parsed.data

    console.log('[car-rental] createPartner called', { name: validatedData.name })

    return db.carRentalPartner.create({
      data: {
        name: validatedData.name,
        terminal: validatedData.terminal,
        contactPhone: validatePhone(validatedData.contactPhone, 'contactPhone'),
        contactEmail: validatedData.contactEmail ?? null,
        commissionRate: validatedData.commissionRate,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Validation failed')) {
      throw error
    }
    throw safeError(error, 'createPartner')
  }
}

/**
 * Update an existing car rental partner (partial).
 */
export async function updatePartner(id: string, data: UpdatePartnerData) {
  try {
    const parsed = updatePartnerSchema.safeParse(data)
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`)
    }

    const partner = await db.carRentalPartner.findUnique({ where: { id } })
    if (!partner) {
      throw new Error('Car rental partner not found')
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name
    if (parsed.data.terminal !== undefined) updateData.terminal = parsed.data.terminal
    if (parsed.data.contactPhone !== undefined) updateData.contactPhone = validatePhone(parsed.data.contactPhone, 'contactPhone')
    if (parsed.data.contactEmail !== undefined) updateData.contactEmail = parsed.data.contactEmail
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive
    if (parsed.data.commissionRate !== undefined) updateData.commissionRate = validateNonNegative(parsed.data.commissionRate, 'commissionRate')

    console.log('[car-rental] updatePartner called', { id, changes: Object.keys(updateData) })

    return db.carRentalPartner.update({
      where: { id },
      data: updateData,
    })
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Validation failed') || error.message.startsWith('Car rental'))) {
      throw error
    }
    throw safeError(error, 'updatePartner')
  }
}

// ═══════════════════════════════════════════════════════════════
// 2. VEHICLE CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * List vehicles with optional filters.
 */
export async function getVehicles(filters: {
  partnerId?: string
  category?: string
  isAvailable?: boolean
  pickupDate?: string
  dropoffDate?: string
}) {
  try {
    const where: Record<string, unknown> = {}

    if (filters.partnerId) {
      where.partnerId = filters.partnerId
    }
    if (filters.category && VEHICLE_CATEGORIES.includes(filters.category as VehicleCategory)) {
      where.category = filters.category
    }
    if (filters.isAvailable !== undefined) {
      where.isAvailable = filters.isAvailable
    }

    console.log('[car-rental] getVehicles called', filters)

    return db.vehicle.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { pricePerDay: 'asc' },
      include: {
        partner: {
          select: { id: true, name: true, terminal: true },
        },
      },
    })
  } catch (error) {
    throw safeError(error, 'getVehicles')
  }
}

/**
 * Create a new vehicle.
 */
export async function createVehicle(data: CreateVehicleData) {
  try {
    const parsed = createVehicleSchema.safeParse(data)
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`)
    }
    const validatedData = parsed.data

    // Validate partner exists
    const partner = await db.carRentalPartner.findUnique({ where: { id: validatedData.partnerId } })
    if (!partner) {
      throw new Error('Car rental partner not found')
    }

    console.log('[car-rental] createVehicle called', {
      partnerId: validatedData.partnerId,
      brand: validatedData.brand,
      model: validatedData.model,
    })

    return db.vehicle.create({
      data: {
        partnerId: validatedData.partnerId,
        category: validatedData.category,
        brand: validatedData.brand,
        model: validatedData.model,
        seats: validatePositiveInteger(validatedData.seats, 'seats'),
        transmission: validatedData.transmission,
        ac: validatedData.ac,
        pricePerDay: validatePositive(validatedData.pricePerDay, 'pricePerDay'),
        currency: validatedData.currency,
        imageUrl: validatedData.imageUrl ?? null,
      },
      include: {
        partner: {
          select: { id: true, name: true, terminal: true },
        },
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Validation failed') || error.message.startsWith('Car rental'))) {
      throw error
    }
    throw safeError(error, 'createVehicle')
  }
}

/**
 * Update an existing vehicle (partial).
 */
export async function updateVehicle(id: string, data: UpdateVehicleData) {
  try {
    const parsed = updateVehicleSchema.safeParse(data)
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`)
    }

    const vehicle = await db.vehicle.findUnique({ where: { id } })
    if (!vehicle) {
      throw new Error('Vehicle not found')
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.data.category !== undefined) updateData.category = parsed.data.category
    if (parsed.data.brand !== undefined) updateData.brand = parsed.data.brand
    if (parsed.data.model !== undefined) updateData.model = parsed.data.model
    if (parsed.data.seats !== undefined) updateData.seats = validatePositiveInteger(parsed.data.seats, 'seats')
    if (parsed.data.transmission !== undefined) updateData.transmission = parsed.data.transmission
    if (parsed.data.ac !== undefined) updateData.ac = parsed.data.ac
    if (parsed.data.pricePerDay !== undefined) updateData.pricePerDay = validatePositive(parsed.data.pricePerDay, 'pricePerDay')
    if (parsed.data.currency !== undefined) updateData.currency = parsed.data.currency
    if (parsed.data.imageUrl !== undefined) updateData.imageUrl = parsed.data.imageUrl
    if (parsed.data.isAvailable !== undefined) updateData.isAvailable = parsed.data.isAvailable

    console.log('[car-rental] updateVehicle called', { id, changes: Object.keys(updateData) })

    return db.vehicle.update({
      where: { id },
      data: updateData,
      include: {
        partner: {
          select: { id: true, name: true, terminal: true },
        },
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Validation failed') || error.message === 'Vehicle not found')) {
      throw error
    }
    throw safeError(error, 'updateVehicle')
  }
}

/**
 * Soft-delete a vehicle by setting isAvailable = false.
 */
export async function deleteVehicle(id: string) {
  try {
    const vehicle = await db.vehicle.findUnique({ where: { id } })
    if (!vehicle) {
      throw new Error('Vehicle not found')
    }

    if (!vehicle.isAvailable) {
      return vehicle
    }

    console.log('[car-rental] deleteVehicle (soft) called', { id })

    return db.vehicle.update({
      where: { id },
      data: { isAvailable: false },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Vehicle not found') {
      throw error
    }
    throw safeError(error, 'deleteVehicle')
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. PRICE CALCULATION
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate total rental price with breakdown.
 *
 * Formula:
 *   days * pricePerDay + insurance (2000 XOF) + childSeat (1500 XOF)
 */
export function calculateTotalPrice(
  pricePerDay: number,
  pickupDate: Date,
  dropoffDate: Date,
  insurance: boolean = false,
  childSeat: boolean = false,
  currency: string = 'XOF'
): PriceBreakdown {
  try {
    const safePricePerDay = validatePositive(pricePerDay, 'pricePerDay')
    const days = calculateDays(pickupDate, dropoffDate)
    const rentalPrice = Math.round(days * safePricePerDay)
    const insuranceCost = insurance ? INSURANCE_COST : 0
    const childSeatCost = childSeat ? CHILD_SEAT_COST : 0
    const totalPrice = rentalPrice + insuranceCost + childSeatCost

    return {
      days,
      rentalPrice,
      insuranceCost,
      childSeatCost,
      totalPrice,
      currency,
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('must be')) {
      throw error
    }
    throw safeError(error, 'calculateTotalPrice')
  }
}

// ═══════════════════════════════════════════════════════════════
// 4. BOOKING CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * List car bookings with optional filters and pagination.
 */
export async function getBookings(filters: {
  status?: string
  page?: number
  limit?: number
}) {
  try {
    const { status, page = 1, limit = 20 } = filters

    const where: Record<string, unknown> = {}
    if (status && BOOKING_STATUSES.includes(status as CarBookingStatus)) {
      where.status = status
    }

    const skip = (page - 1) * limit

    console.log('[car-rental] getBookings called', filters)

    const [bookings, total] = await Promise.all([
      db.carBooking.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          vehicle: {
            include: {
              partner: {
                select: { id: true, name: true, terminal: true },
              },
            },
          },
          partner: {
            select: { id: true, name: true, terminal: true },
          },
        },
      }),
      db.carBooking.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ])

    return {
      data: bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    throw safeError(error, 'getBookings')
  }
}

/**
 * Create a new car booking.
 * Generates confirmationCode, calculates totalPrice, sets status = pending_payment.
 */
export async function createBooking(data: CreateBookingData) {
  try {
    const parsed = createBookingSchema.safeParse(data)
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`)
    }
    const validatedData = parsed.data

    const safeUserPhone = validatePhone(validatedData.userPhone, 'userPhone')

    // Validate vehicle exists and is available
    const vehicle = await db.vehicle.findUnique({
      where: { id: validatedData.vehicleId },
      include: { partner: true },
    })

    if (!vehicle) {
      throw new Error('Vehicle not found')
    }

    if (!vehicle.isAvailable) {
      throw new Error('Vehicle is not available for booking')
    }

    const pickupDate = new Date(validatedData.pickupDate)
    const dropoffDate = new Date(validatedData.dropoffDate)

    if (dropoffDate <= pickupDate) {
      throw new Error('dropoffDate must be after pickupDate')
    }

    // Calculate total price
    const priceBreakdown = calculateTotalPrice(
      vehicle.pricePerDay,
      pickupDate,
      dropoffDate,
      validatedData.insurance,
      validatedData.childSeat,
      validatedData.currency
    )

    // Generate unique confirmation code
    const confirmationCode = await generateUniqueConfirmationCode()

    console.log('[car-rental] createBooking called', {
      vehicleId: validatedData.vehicleId,
      userPhone: safeUserPhone,
      confirmationCode,
      totalPrice: priceBreakdown.totalPrice,
    })

    const booking = await db.carBooking.create({
      data: {
        vehicleId: vehicle.id,
        partnerId: vehicle.partnerId,
        userPhone: safeUserPhone,
        userName: validatedData.userName?.trim() || null,
        pickupDate,
        dropoffDate,
        pickupLocation: validatedData.pickupLocation.trim(),
        status: 'pending_payment',
        totalPrice: priceBreakdown.totalPrice,
        currency: validatedData.currency,
        insurance: validatedData.insurance,
        childSeat: validatedData.childSeat,
        confirmationCode,
      },
      include: {
        vehicle: {
          include: {
            partner: {
              select: { id: true, name: true, terminal: true },
            },
          },
        },
        partner: {
          select: { id: true, name: true, terminal: true },
        },
      },
    })

    return {
      booking,
      priceBreakdown,
    }
  } catch (error) {
    if (error instanceof Error && (
      error.message.startsWith('Validation failed') ||
      error.message === 'Vehicle not found' ||
      error.message === 'Vehicle is not available for booking' ||
      error.message === 'dropoffDate must be after pickupDate'
    )) {
      throw error
    }
    throw safeError(error, 'createBooking')
  }
}

/**
 * Get a single booking by ID.
 */
export async function getBookingById(id: string) {
  try {
    console.log('[car-rental] getBookingById called', { id })

    return db.carBooking.findUnique({
      where: { id },
      include: {
        vehicle: {
          include: {
            partner: {
              select: { id: true, name: true, terminal: true },
            },
          },
        },
        partner: {
          select: { id: true, name: true, terminal: true },
        },
      },
    })
  } catch (error) {
    throw safeError(error, 'getBookingById')
  }
}

// ═══════════════════════════════════════════════════════════════
// 5. BOOKING STATUS UPDATE
// ═══════════════════════════════════════════════════════════════

/**
 * Valid status transitions for car booking state machine.
 * Key = current status, Value = array of allowed next statuses.
 */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['confirmed', 'cancelled'],
  confirmed: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

/**
 * Manually update a booking's status.
 * Enforces state machine transitions to prevent invalid status changes.
 * Allowed: confirm → confirmed, cancel → cancelled, complete → completed
 */
export async function updateBookingStatus(id: string, targetAction: string) {
  try {
    const parsed = statusUpdateSchema.safeParse({ status: targetAction })
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`)
    }

    const booking = await db.carBooking.findUnique({ where: { id } })
    if (!booking) {
      throw new Error('Car booking not found')
    }

    const statusMap: Record<string, string> = {
      confirmed: 'confirmed',
      active: 'active',
      completed: 'completed',
      cancelled: 'cancelled',
    }

    const newStatus = statusMap[targetAction]
    if (!newStatus) {
      throw new Error(`Invalid action: ${targetAction}`)
    }

    // Idempotent: no-op if already in target status
    if (booking.status === newStatus) {
      return booking
    }

    // State machine: validate transition
    const allowedTransitions = STATUS_TRANSITIONS[booking.status] ?? []
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`Invalid transition: cannot change status from '${booking.status}' to '${newStatus}'`)
    }

    console.log('[car-rental] updateBookingStatus called', { id, action: targetAction, from: booking.status, to: newStatus })

    return db.carBooking.update({
      where: { id },
      data: { status: newStatus },
      include: {
        vehicle: {
          include: {
            partner: {
              select: { id: true, name: true, terminal: true },
            },
          },
        },
        partner: {
          select: { id: true, name: true, terminal: true },
        },
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Validation failed') || error.message === 'Car booking not found' || error.message.startsWith('Invalid'))) {
      throw error
    }
    throw safeError(error, 'updateBookingStatus')
  }
}

// ═══════════════════════════════════════════════════════════════
// 6. PAYMENT CALLBACK (Placeholder)
// ═══════════════════════════════════════════════════════════════

/**
 * Process a payment callback for a car booking.
 * Placeholder for OM/Wave integration.
 * Sets status to "paid" if paymentRef is provided.
 */
export async function processPayment(bookingId: string, data: { paymentRef: string; status?: string }) {
  try {
    const parsed = paymentCallbackSchema.safeParse(data)
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`)
    }

    const booking = await db.carBooking.findUnique({ where: { id: bookingId } })
    if (!booking) {
      throw new Error('Car booking not found')
    }

    if (booking.status !== 'pending_payment') {
      throw new Error(`Cannot process payment for booking with status: ${booking.status}`)
    }

    const newStatus = parsed.data.status === 'paid' ? 'paid' : 'paid'

    console.log('[car-rental] processPayment called', {
      bookingId,
      paymentRef: parsed.data.paymentRef,
      newStatus,
    })

    return db.carBooking.update({
      where: { id: bookingId },
      data: {
        status: newStatus,
        paymentRef: parsed.data.paymentRef,
      },
      include: {
        vehicle: {
          include: {
            partner: {
              select: { id: true, name: true, terminal: true },
            },
          },
        },
        partner: {
          select: { id: true, name: true, terminal: true },
        },
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Validation failed') || error.message === 'Car booking not found' || error.message.startsWith('Cannot process'))) {
      throw error
    }
    throw safeError(error, 'processPayment')
  }
}
