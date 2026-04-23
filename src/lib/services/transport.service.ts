import { db } from '@/lib/db'

// ═══════════════════════════════════════════════════════════════
// MAELLIS Airport Bot — Transport Service
// Full business logic for transport providers & bookings
// ═══════════════════════════════════════════════════════════════

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
    const where: Record<string, unknown> = { airportCode }

    if (activeOnly) {
      where.isActive = true
    }

    if (type) {
      where.type = type
    }

    return db.transportProvider.findMany({
      where,
      orderBy: { name: 'asc' },
    })
  } catch (error) {
    console.error('[transport.service] getProviders error:', error)
    throw error
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
    console.error('[transport.service] getProviderById error:', error)
    throw error
  }
}

/**
 * Create a new transport provider (admin operation).
 * Handles all fields including pricing, contacts, and service zones.
 * @throws Prisma P2002 if provider name already exists for this airport
 */
export async function createProvider(data: CreateProviderData) {
  try {
    return db.transportProvider.create({
      data: {
        airportCode: data.airportCode,
        name: data.name,
        type: data.type,
        logoUrl: data.logoUrl ?? null,
        baseFare: data.baseFare,
        perKmRate: data.perKmRate,
        minFare: data.minFare,
        nightSurcharge: data.nightSurcharge ?? 0,
        contactPhone: data.contactPhone ?? '',
        contactEmail: data.contactEmail ?? '',
        whatsappNumber: data.whatsappNumber ?? '',
        contacts: data.contacts ?? null,
        serviceZones: normalizeServiceZones(data.serviceZones),
      },
    })
  } catch (error) {
    console.error('[transport.service] createProvider error:', error)
    throw error
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
    if (data.baseFare !== undefined) updateData.baseFare = data.baseFare
    if (data.perKmRate !== undefined) updateData.perKmRate = data.perKmRate
    if (data.minFare !== undefined) updateData.minFare = data.minFare
    if (data.nightSurcharge !== undefined) updateData.nightSurcharge = data.nightSurcharge
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
    console.error('[transport.service] updateProvider error:', error)
    throw error
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
    console.error('[transport.service] deleteProvider error:', error)
    throw error
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
    // Step 1–3: Base + distance
    const basePrice = provider.baseFare
    const distancePrice = distanceKm * provider.perKmRate
    let price = basePrice + distancePrice

    // Step 4: Apply minimum fare floor
    if (price < provider.minFare) {
      price = provider.minFare
    }

    // Step 5: Night surcharge (22h–5h59)
    const hour = parsePickupHour(pickupTime)
    let nightSurchargeAmount = 0

    if (hour >= 22 || hour < 6) {
      nightSurchargeAmount = Math.round(price * provider.nightSurcharge)
      price += nightSurchargeAmount
    }

    // Step 6: Extra passenger surcharge (>4 passengers)
    let extraPassengerAmount = 0
    if (passengers > 4) {
      extraPassengerAmount = (passengers - 4) * 1000
      price += extraPassengerAmount
    }

    return {
      distanceKm,
      basePrice: Math.round(basePrice),
      distancePrice: Math.round(distancePrice),
      nightSurchargeAmount,
      extraPassengerAmount,
      totalPrice: Math.round(price),
      currency: 'XOF',
    }
  } catch (error) {
    console.error('[transport.service] calculatePrice error:', error)
    throw error
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
    // 1. Fetch provider
    const provider = await db.transportProvider.findUnique({
      where: { id: data.providerId },
    })

    if (!provider) {
      throw new Error('Transport provider not found')
    }

    if (!provider.isActive) {
      throw new Error('Transport provider is currently inactive')
    }

    // 2. Calculate price
    const distanceKm = data.distanceKm ?? 10
    const passengers = data.passengers ?? 1
    const priceBreakdown = calculatePrice(
      provider,
      distanceKm,
      passengers,
      data.pickupTime
    )

    // 3. Generate unique booking reference
    const bookingRef = await generateUniqueBookingRef()

    // 4. Create booking in database
    const booking = await db.transportBooking.create({
      data: {
        providerId: provider.id,
        passengerName: data.passengerName,
        phone: data.phone,
        email: data.email ?? null,
        vehicleType: data.vehicleType || provider.type,
        pickupLocation: data.pickupLocation,
        dropoffLocation: data.dropoffLocation,
        pickupDate: data.pickupDate,
        pickupTime: data.pickupTime,
        passengers,
        totalPrice: priceBreakdown.totalPrice,
        paymentMethod: data.paymentMethod ?? null,
        paymentStatus: 'pending',
        bookingRef,
        distanceKm,
        estimatedPrice: priceBreakdown.totalPrice,
        status: 'requested',
      },
      include: {
        provider: true,
      },
    })

    // 5. Return booking with provider
    return booking
  } catch (error) {
    console.error('[transport.service] createBooking error:', error)
    throw error
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
      include: { provider: true },
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
        driverPhone: driver.phone,
        vehiclePlate: driver.plate,
        status: 'assigned',
      },
      include: {
        provider: true,
      },
    })
  } catch (error) {
    console.error('[transport.service] assignDriver error:', error)
    throw error
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
      include: { provider: true },
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
        provider: true,
      },
    })
  } catch (error) {
    console.error('[transport.service] updateBookingStatus error:', error)
    throw error
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
    const where: Record<string, unknown> = {}

    if (providerId) {
      where.providerId = providerId
    }

    if (status) {
      where.status = status
    }

    return db.transportBooking.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        provider: true,
      },
    })
  } catch (error) {
    console.error('[transport.service] getBookings error:', error)
    throw error
  }
}
