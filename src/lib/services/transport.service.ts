import { db } from '@/lib/db'

// ─────────────────────────────────────────────
// Provider CRUD
// ─────────────────────────────────────────────

export async function getProviders(airportCode: string, type?: string) {
  const where: Record<string, unknown> = {
    airportCode,
    isActive: true,
  }

  if (type) {
    where.type = type
  }

  return db.transportProvider.findMany({
    where,
    orderBy: { name: 'asc' },
  })
}

export async function getProviderById(id: string) {
  return db.transportProvider.findUnique({
    where: { id },
  })
}

export async function createProvider(data: {
  airportCode: string
  name: string
  type: string
  baseFare: number
  perKmRate: number
  minFare: number
  contacts?: string
  logoUrl?: string
}) {
  return db.transportProvider.create({
    data: {
      airportCode: data.airportCode,
      name: data.name,
      type: data.type,
      baseFare: data.baseFare,
      perKmRate: data.perKmRate,
      minFare: data.minFare,
      contacts: data.contacts ?? null,
      logoUrl: data.logoUrl ?? null,
    },
  })
}

export async function updateProvider(
  id: string,
  data: Partial<{
    airportCode: string
    name: string
    type: string
    baseFare: number
    perKmRate: number
    minFare: number
    contacts: string | null
    logoUrl: string | null
    isActive: boolean
  }>
) {
  return db.transportProvider.update({
    where: { id },
    data,
  })
}

export async function deleteProvider(id: string) {
  return db.transportProvider.delete({
    where: { id },
  })
}

// ─────────────────────────────────────────────
// Booking business logic
// ─────────────────────────────────────────────

function generateBookingRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // avoids ambiguous chars I, O, 0, 1
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `TRN-${code}`
}

export async function createBooking(data: {
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
}) {
  // 1. Fetch provider
  const provider = await db.transportProvider.findUnique({
    where: { id: data.providerId },
  })

  if (!provider) {
    throw new Error('Transport provider not found')
  }

  // 2. Verify isActive
  if (!provider.isActive) {
    throw new Error('Transport provider is currently inactive')
  }

  // 3. Calculate estimated price
  const distanceKm = data.distanceKm ?? 10
  const calculated = provider.baseFare + distanceKm * provider.perKmRate
  const estimatedPrice = Math.max(calculated, provider.minFare)

  // 4. Generate unique booking reference
  let bookingRef = generateBookingRef()
  // Ensure uniqueness — retry if collision (very unlikely with 4 alphanumeric chars)
  const existing = await db.transportBooking.findUnique({ where: { bookingRef } })
  if (existing) {
    bookingRef = generateBookingRef() // second attempt
  }

  // 5. Create TransportBooking in DB
  const booking = await db.transportBooking.create({
    data: {
      providerId: provider.id,
      passengerName: data.passengerName,
      phone: data.phone,
      pickupLocation: data.pickupLocation,
      dropoffLocation: data.dropoffLocation,
      pickupDate: data.pickupDate,
      pickupTime: data.pickupTime,
      passengers: data.passengers ?? 1,
      vehicleType: provider.type, // set from provider for backward compat
      totalPrice: estimatedPrice,
      bookingRef,
      distanceKm,
      estimatedPrice,
      status: 'pending',
      paymentStatus: 'pending',
    },
    include: {
      provider: true,
    },
  })

  // 6. Return booking with estimated price
  return booking
}

export async function updateBookingStatus(
  bookingId: string,
  status: string,
  driverInfo?: { name: string; phone: string; plate: string }
) {
  const updateData: Record<string, unknown> = { status }

  if (driverInfo) {
    updateData.driverName = driverInfo.name
    updateData.driverPhone = driverInfo.phone
    updateData.vehiclePlate = driverInfo.plate
  }

  return db.transportBooking.update({
    where: { id: bookingId },
    data: updateData,
    include: {
      provider: true,
    },
  })
}

export async function getBookings(providerId?: string, status?: string) {
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
}
