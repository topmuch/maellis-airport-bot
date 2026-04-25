import { db } from '@/lib/db'
import { z } from 'zod'

// ═══════════════════════════════════════════════════════════════
// MAELLIS Airport Bot — Transport Service
// Full business logic for transport providers & bookings
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

/** Wrap error to prevent internal details from leaking */
function safeError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (process.env.NODE_ENV === 'development') {
    console.error(`[transport.service] ${context}:`, message)
  }
  if (error instanceof Error) {
    return new Error(error.message.includes('Prisma') ? 'Database error' : error.message)
  }
  return new Error('An unexpected error occurred')
}

/** Validate phone format */
function validatePhone(phone: unknown, fieldName = 'phone'): string {
  if (typeof phone !== 'string' || !/^[+\d\s\-()]{6,20}$/.test(phone.trim())) {
    throw new Error(`Invalid ${fieldName}: must be 6-20 characters and contain only digits, spaces, +, -, ()`)
  }
  return phone.trim()
}

// ─────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────

/** Price breakdown returned by calculatePrice */
export interface PriceBreakdown {
  distanceKm: number
  basePrice: number
  distancePrice: number
  nightSurchargeAmount: number
  extraPassengerAmount: number
  totalPrice: number
  currency: string
}

/** Data to create a new transport provider (admin) */
export interface CreateProviderData {
  airportCode: string
  name: string
  type: string // taxi | vtc | shuttle | private
  logoUrl?: string
  baseFare: number
  perKmRate: number
  minFare: number
  nightSurcharge?: number
  contactPhone?: string
  contactEmail?: string
  whatsappNumber?: string
  contacts?: string
  serviceZones?: string[] | string
}

/** Data to update an existing transport provider (partial) */
export interface UpdateProviderData {
  airportCode?: string
  name?: string
  type?: string
  logoUrl?: string | null
  isActive?: boolean
  baseFare?: number
  perKmRate?: number
  minFare?: number
  nightSurcharge?: number
  contactPhone?: string
  contactEmail?: string
  whatsappNumber?: string
  contacts?: string | null
  serviceZones?: string[] | string
}

/** Data to create a new transport booking */
export interface CreateBookingData {
  providerId: string
  passengerName: string
  phone: string
  email?: string
  pickupLocation: string
  dropoffLocation: string
  pickupDate: string
  pickupTime: string
  passengers?: number
  distanceKm?: number
  vehicleType?: string
  paymentMethod?: string
}

/** Data to assign a driver to a booking */
export interface AssignDriverData {
  name: string
  phone: string
  plate: string
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

export const TRANSPORT_TYPES = ['taxi', 'vtc', 'shuttle', 'private'] as const
export type TransportType = (typeof TRANSPORT_TYPES)[number]

export const BOOKING_STATUSES = [
  'pending',
  'requested',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

// ─── Zod Validation Schemas ──────────────────────────────────────────────

const transportTypeZodEnum = z.enum(TRANSPORT_TYPES)
const bookingStatusZodEnum = z.enum(BOOKING_STATUSES)
const yyyyMmddRegex = /^\d{4}-\d{2}-\d{2}$/
const dateSchema = z.string().regex(yyyyMmddRegex, 'Must be a valid date in YYYY-MM-DD format')
const hhMmRegex = /^\d{2}:\d{2}$/
const timeSchema = z.string().regex(hhMmRegex, 'Must be a valid time in HH:MM format')

const getProvidersSchema = z.object({
  airportCode: z.string().min(1, 'airportCode is required'),
  type: transportTypeZodEnum.optional(),
  activeOnly: z.boolean().default(true),
})

const getBookingsSchema = z.object({
  providerId: z.string().optional(),
  status: bookingStatusZodEnum.optional(),
})

const vehicleTypeEnum = z.enum(['taxi', 'vtc', 'shuttle', 'private', 'sedan', 'suv', 'van', 'bus'])

const createBookingSchema = z.object({
  providerId: z.string().min(1, 'providerId is required'),
  passengerName: z.string().min(1, 'passengerName is required').max(200, 'passengerName must be at most 200 characters'),
  phone: z.string().min(6, 'phone is required'),
  email: z.string().email('Invalid email format').optional(),
  pickupLocation: z.string().min(1, 'pickupLocation is required').max(200),
  dropoffLocation: z.string().min(1, 'dropoffLocation is required').max(200),
  pickupDate: dateSchema,
  pickupTime: timeSchema,
  passengers: z.coerce.number().int().min(1).default(1),
  distanceKm: z.number().min(0).optional(),
  vehicleType: vehicleTypeEnum.optional(),
  paymentMethod: z.string().max(50).optional(),
})

/** Allowed status transitions */
const STATUS_TRANSITIONS: Record<string, BookingStatus[]> = {
  pending: ['assigned', 'cancelled'],
  requested: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

// ─────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────

/**
 * Generate a booking reference in the format TRN-XXXX.
 * Uses unambiguous character set (no I, O, 0, 1).
 */
function generateBookingRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `TRN-${code}`
}

/**
 * Generate a unique booking reference, retrying on collision (max 5).
 * Falls back to a timestamp-based code if all random codes collide.
 */
async function generateUniqueBookingRef(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const ref = generateBookingRef()
    const existing = await db.transportBooking.findUnique({ where: { bookingRef: ref } })
    if (!existing) return ref
  }
  return `TRN-${Date.now().toString(36).toUpperCase().slice(-4)}`
}

/**
 * Normalize serviceZones input (string[] or JSON string) into a JSON array string.
 */
function normalizeServiceZones(zones?: string[] | string): string {
  if (!zones) return '[]'
  if (Array.isArray(zones)) return JSON.stringify(zones)
  try {
    const parsed = JSON.parse(zones)
    if (Array.isArray(parsed)) return zones
  } catch {
    // Not valid JSON — treat as a single zone string
  }
  return JSON.stringify([zones])
}

/**
 * Parse the hour from a "HH:MM" time string, falling back to current hour.
 */
function parsePickupHour(pickupTime?: string): number {
  if (pickupTime) {
    const hour = parseInt(pickupTime.split(':')[0], 10)
    if (!isNaN(hour) && hour >= 0 && hour <= 23) return hour
  }
  return new Date().getHours()
}

// ═══════════════════════════════════════════════════════════════
// 1. PROVIDER CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * List transport providers for an airport, with optional type and activeOnly filters.
 * @param airportCode - IATA airport code (e.g. "DSS")
 * @param type - Optional filter: taxi | vtc | shuttle | private
 * @param activeOnly - Default true; set false to include inactive providers
 */
export async function getProviders(
  airportCode: string,
  type?: string,
  activeOnly: boolean = true
) {
  try {
    // Zod validation
    const parsed = getProvidersSchema.safeParse({ airportCode, type, activeOnly })
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`)
    }
    const { airportCode: ac, type: tp, activeOnly: ao } = parsed.data

    const where: Record<string, unknown> = { airportCode: ac }

    if (ao) {
      where.isActive = true
    }

    if (tp) {
      where.type = tp
    }

    return db.transportProvider.findMany({
      where,
      orderBy: { name: 'asc' },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Validation failed') || error.message.includes('must be'))) {
      throw error
    }
    throw safeError(error, 'getProviders')
  }
}

/**
 * Get a single transport provider by ID.
 * Returns null if not found.
 */
export async function getProviderById(id: string) {
  try {
    return db.transportProvider.findUnique({
      where: { id },
    })
  } catch (error) {
    throw safeError(error, 'getProviderById')
  }
}

/**
 * Create a new transport provider (admin operation).
 * Handles all fields including pricing, contacts, and service zones.
 * @throws Prisma P2002 if provider name already exists for this airport
 */
export async function createProvider(data: CreateProviderData) {
  try {
    // Validate pricing fields
    const safeBaseFare = validateNonNegative(data.baseFare, 'baseFare')
    const safePerKmRate = validateNonNegative(data.perKmRate, 'perKmRate')
    const safeMinFare = validateNonNegative(data.minFare, 'minFare')
    const safeNightSurcharge = validateNonNegative(data.nightSurcharge ?? 0, 'nightSurcharge')

    return db.transportProvider.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        airportCode: data.airportCode,
        name: data.name,
        type: data.type,
        logoUrl: data.logoUrl ?? null,
        baseFare: safeBaseFare,
        perKmRate: safePerKmRate,
        minFare: safeMinFare,
        nightSurcharge: safeNightSurcharge,
        contactPhone: data.contactPhone ?? '',
        contactEmail: data.contactEmail ?? '',
        whatsappNumber: data.whatsappNumber ?? '',
        contacts: data.contacts ?? null,
        serviceZones: normalizeServiceZones(data.serviceZones),
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.includes('must be'))) {
      throw error
    }
    throw safeError(error, 'createProvider')
  }
}

/**
 * Update an existing transport provider (admin operation).
 * Supports partial updates — only provided fields will be changed.
 * @throws Prisma P2002 if renaming to a name that already exists for this airport
 */
export async function updateProvider(id: string, data: UpdateProviderData) {
  try {
    const updateData: Record<string, unknown> = {}

    if (data.airportCode !== undefined) updateData.airportCode = data.airportCode
    if (data.name !== undefined) updateData.name = data.name
    if (data.type !== undefined) updateData.type = data.type
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.baseFare !== undefined) updateData.baseFare = validateNonNegative(data.baseFare, 'baseFare')
    if (data.perKmRate !== undefined) updateData.perKmRate = validateNonNegative(data.perKmRate, 'perKmRate')
    if (data.minFare !== undefined) updateData.minFare = validateNonNegative(data.minFare, 'minFare')
    if (data.nightSurcharge !== undefined) updateData.nightSurcharge = validateNonNegative(data.nightSurcharge, 'nightSurcharge')
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone
    if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail
    if (data.whatsappNumber !== undefined) updateData.whatsappNumber = data.whatsappNumber
    if (data.contacts !== undefined) updateData.contacts = data.contacts
    if (data.serviceZones !== undefined) {
      updateData.serviceZones = normalizeServiceZones(data.serviceZones)
    }

    return db.transportProvider.update({
      where: { id },
      data: updateData,
    })
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.includes('must be'))) {
      throw error
    }
    throw safeError(error, 'updateProvider')
  }
}

/**
 * Soft-delete a transport provider by setting isActive = false.
 * Preserves referential integrity with existing bookings.
 * @throws if provider ID not found
 */
export async function deleteProvider(id: string) {
  try {
    const provider = await db.transportProvider.findUnique({ where: { id } })
    if (!provider) {
      throw new Error('Transport provider not found')
    }

    // Already inactive — no-op
    if (!provider.isActive) {
      return provider
    }

    return db.transportProvider.update({
      where: { id },
      data: { isActive: false },
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Transport')) {
      throw error
    }
    throw safeError(error, 'deleteProvider')
  }
}

// ═══════════════════════════════════════════════════════════════
// 6. PRICE CALCULATION — THE KEY FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate transport price with full breakdown.
 *
 * Formula:
 *   1. basePrice = baseFare
 *   2. distancePrice = distanceKm × perKmRate
 *   3. price = basePrice + distancePrice
 *   4. If price < minFare → price = minFare
 *   5. Night surcharge (22:00–05:59): price × (1 + nightSurcharge)
 *   6. Extra passengers (>4): +(passengers - 4) × 1000 XOF
 *
 * @param provider - Transport provider with pricing fields
 * @param distanceKm - Trip distance in kilometers
 * @param passengers - Number of passengers (default 1)
 * @param pickupTime - HH:MM format (e.g. "23:30"); defaults to current hour
 * @returns PriceBreakdown with flat surcharge fields
 */
export function calculatePrice(
  provider: {
    baseFare: number
    perKmRate: number
    minFare: number
    nightSurcharge: number
  },
  distanceKm: number,
  passengers: number = 1,
  pickupTime?: string
): PriceBreakdown {
  try {
    // Validate inputs
    const safeDistanceKm = validateNonNegative(distanceKm, 'distanceKm')
    const safePassengers = validatePositiveInteger(passengers, 'passengers')
    const safeBaseFare = validateNonNegative(provider.baseFare, 'baseFare')
    const safePerKmRate = validateNonNegative(provider.perKmRate, 'perKmRate')
    const safeMinFare = validateNonNegative(provider.minFare, 'minFare')
    const safeNightSurcharge = validateNonNegative(provider.nightSurcharge, 'nightSurcharge')

    // Step 1–3: Base + distance
    const basePrice = safeBaseFare
    const distancePrice = safeDistanceKm * safePerKmRate
    let price = basePrice + distancePrice

    // Step 4: Apply minimum fare floor
    if (price < safeMinFare) {
      price = safeMinFare
    }

    // Step 5: Night surcharge (22h–5h59)
    const hour = parsePickupHour(pickupTime)
    let nightSurchargeAmount = 0

    if (hour >= 22 || hour < 6) {
      nightSurchargeAmount = Math.round(price * safeNightSurcharge)
      price += nightSurchargeAmount
    }

    // Step 6: Extra passenger surcharge (>4 passengers)
    let extraPassengerAmount = 0
    if (safePassengers > 4) {
      extraPassengerAmount = (safePassengers - 4) * 1000
      price += extraPassengerAmount
    }

    return {
      distanceKm: safeDistanceKm,
      basePrice: Math.round(basePrice),
      distancePrice: Math.round(distancePrice),
      nightSurchargeAmount,
      extraPassengerAmount,
      totalPrice: Math.round(price),
      currency: 'XOF',
    }
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.includes('must be'))) {
      throw error
    }
    throw safeError(error, 'calculatePrice')
  }
}

// ═══════════════════════════════════════════════════════════════
// 7. BOOKING CREATION
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new transport booking with full price calculation.
 *
 * Steps:
 *  1. Fetch and validate provider (must exist and be active)
 *  2. Calculate price using provider rates + night surcharge + extra passengers
 *  3. Generate unique booking reference (TRN-XXXX)
 *  4. Create booking record with estimatedPrice, distanceKm, email
 *  5. Return booking with provider relation included
 *
 * @throws Error if provider not found or inactive
 */
export async function createBooking(data: CreateBookingData) {
  try {
    // Zod validation
    const parsed = createBookingSchema.safeParse(data)
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`)
    }
    const validatedData = parsed.data

    // Validate inputs
    const safePassengerName = validatedData.passengerName.trim().slice(0, 200)
    const safePickupLocation = validatedData.pickupLocation.trim().slice(0, 200)
    const safeDropoffLocation = validatedData.dropoffLocation.trim().slice(0, 200)
    const safePhone = validatePhone(validatedData.phone, 'phone')

    // 1. Fetch provider
    const provider = await db.transportProvider.findUnique({
      where: { id: validatedData.providerId },
    })

    if (!provider) {
      throw new Error('Transport provider not found')
    }

    if (!provider.isActive) {
      throw new Error('Transport provider is currently inactive')
    }

    // 2. Calculate price
    const distanceKm = validateNonNegative(validatedData.distanceKm ?? 10, 'distanceKm')
    const passengers = validatePositiveInteger(validatedData.passengers ?? 1, 'passengers')
    const priceBreakdown = calculatePrice(
      provider,
      distanceKm,
      passengers,
      validatedData.pickupTime
    )

    // 3. Generate unique booking reference
    const bookingRef = await generateUniqueBookingRef()

    // 4. Create booking in database
    const booking = await db.transportBooking.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        providerId: provider.id,
        passengerName: safePassengerName,
        phone: safePhone,
        email: validatedData.email ?? null,
        vehicleType: validatedData.vehicleType || provider.type,
        pickupLocation: safePickupLocation,
        dropoffLocation: safeDropoffLocation,
        pickupDate: validatedData.pickupDate,
        pickupTime: validatedData.pickupTime,
        passengers,
        totalPrice: priceBreakdown.totalPrice,
        paymentMethod: validatedData.paymentMethod ?? null,
        paymentStatus: 'pending',
        bookingRef,
        distanceKm,
        estimatedPrice: priceBreakdown.totalPrice,
        status: 'requested',
      },
      include: {
        TransportProvider: true,
      },
    })

    // 5. Return booking with provider
    return booking
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Validation failed') || error.message.startsWith('Transport') || error.message.includes('must be') || error.message.includes('is required'))) {
      throw error
    }
    throw safeError(error, 'createBooking')
  }
}

// ═══════════════════════════════════════════════════════════════
// 8. DRIVER ASSIGNMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Assign a driver to a booking and change status to 'assigned'.
 * Only allowed from pending/requested status.
 * @throws if booking not found or status doesn't allow assignment
 */
export async function assignDriver(bookingId: string, driver: AssignDriverData) {
  try {
    const booking = await db.transportBooking.findUnique({
      where: { id: bookingId },
      include: { TransportProvider: true },
    })

    if (!booking) {
      throw new Error('Transport booking not found')
    }

    // Validate status transition: only pending/requested → assigned
    const allowedTransitions = STATUS_TRANSITIONS[booking.status] || []
    if (!allowedTransitions.includes('assigned')) {
      throw new Error(
        `Cannot assign driver: booking is '${booking.status}', expected 'pending' or 'requested'`
      )
    }

    return db.transportBooking.update({
      where: { id: bookingId },
      data: {
        driverName: driver.name,
        driverPhone: validatePhone(driver.phone, 'driver phone'),
        vehiclePlate: driver.plate,
        status: 'assigned',
      },
      include: {
        TransportProvider: true,
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.startsWith('Transport') || error.message.startsWith('Cannot'))) {
      throw error
    }
    throw safeError(error, 'assignDriver')
  }
}

// ═══════════════════════════════════════════════════════════════
// 9. BOOKING STATUS UPDATE
// ═══════════════════════════════════════════════════════════════

/**
 * Update a booking's status with lifecycle validation.
 *
 * Allowed transitions:
 *   pending/requested → assigned, cancelled
 *   assigned          → in_progress, cancelled
 *   in_progress       → completed, cancelled
 *   completed         → (terminal)
 *   cancelled         → (terminal)
 *
 * @throws if booking not found, invalid status, or invalid transition
 */
export async function updateBookingStatus(bookingId: string, status: string) {
  try {
    // Validate status value
    if (!BOOKING_STATUSES.includes(status as BookingStatus)) {
      throw new Error(
        `Invalid status '${status}'. Must be one of: ${BOOKING_STATUSES.join(', ')}`
      )
    }

    // Fetch current booking
    const booking = await db.transportBooking.findUnique({
      where: { id: bookingId },
      include: { TransportProvider: true },
    })

    if (!booking) {
      throw new Error('Transport booking not found')
    }

    // Idempotent: no-op if already in target status
    if (booking.status === status) {
      return booking
    }

    // Validate status transition
    const allowedTransitions = STATUS_TRANSITIONS[booking.status] || []
    if (!allowedTransitions.includes(status as BookingStatus)) {
      throw new Error(
        `Invalid status transition: '${booking.status}' → '${status}'. ` +
        `Allowed: ${allowedTransitions.join(', ') || 'none (terminal state)'}`
      )
    }

    return db.transportBooking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        TransportProvider: true,
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.startsWith('Transport'))) {
      throw error
    }
    throw safeError(error, 'updateBookingStatus')
  }
}

// ═══════════════════════════════════════════════════════════════
// 10. BOOKING LIST
// ═══════════════════════════════════════════════════════════════

/**
 * List transport bookings with optional filters.
 * Always includes the related provider.
 *
 * @param providerId - Filter by provider ID
 * @param status - Filter by booking status
 */
export async function getBookings(providerId?: string, status?: string) {
  try {
    // Zod validation
    const parsed = getBookingsSchema.safeParse({ providerId, status })
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`)
    }

    const where: Record<string, unknown> = {}

    if (parsed.data.providerId) {
      where.providerId = parsed.data.providerId
    }

    if (parsed.data.status) {
      where.status = parsed.data.status
    }

    return db.transportBooking.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        TransportProvider: true,
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Validation failed') || error.message.includes('must be'))) {
      throw error
    }
    throw safeError(error, 'getBookings')
  }
}
