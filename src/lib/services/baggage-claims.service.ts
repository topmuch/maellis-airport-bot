import { db } from '@/lib/db'
import { differenceInMinutes } from 'date-fns'

// ─────────────────────────────────────────────────────────────────────────────
// MAELLIS Airport Bot — Baggage Claims Service
// Business logic for lost/damaged/delayed baggage claim management
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────
// Valid statuses & allowed transitions
// ─────────────────────────────────────────────

const VALID_STATUSES = [
  'open',
  'investigating',
  'resolved',
  'compensated',
  'rejected',
] as const

// open → investigating → resolved | compensated | rejected
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  open: ['investigating', 'rejected'],
  investigating: ['resolved', 'compensated', 'rejected'],
  resolved: [],
  compensated: [],
  rejected: ['open'], // Allow reopening rejected claims
}

function isValidStatus(status: string): boolean {
  return (VALID_STATUSES as readonly string[]).includes(status)
}

// ─────────────────────────────────────────────
// 1. fileClaim — Create a baggage claim from WhatsApp/bot
// ─────────────────────────────────────────────

export async function fileClaim(data: {
  phone: string
  passengerName: string
  flightNumber?: string
  description: string
  location?: string
  baggageId?: string
}) {
  try {
    const { phone, passengerName, flightNumber, description, location, baggageId } = data

    if (!phone || !passengerName || !description) {
      throw new Error('phone, passengerName, and description are required')
    }

    // If baggageId is provided, verify it exists
    if (baggageId) {
      const baggage = await db.baggageQR.findUnique({
        where: { id: baggageId },
      })
      if (!baggage) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[baggage-claims.service] fileClaim: baggage "${baggageId}" not found, proceeding without link`)
        }
      }
    }

    return db.baggageClaim.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        baggageId: baggageId || null,
        phone,
        passengerName,
        flightNumber: flightNumber || null,
        description,
        location: location || null,
        status: 'open',
      },
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[baggage-claims.service] fileClaim failed:', error)
    }
    throw error
  }
}

// ─────────────────────────────────────────────
// 2. getClaims — List claims with pagination & filters
// ─────────────────────────────────────────────

export async function getClaims(params?: {
  status?: string
  phone?: string
  page?: number
  limit?: number
}) {
  try {
    const status = params?.status
    const phone = params?.phone
    const page = Math.max(1, params?.page || 1)
    const limit = Math.min(100, Math.max(1, params?.limit || 20))
    const skip = (page - 1) * limit

    // Validate status filter
    if (status && !isValidStatus(status)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[baggage-claims.service] getClaims: invalid status "${status}"`)
      }
      return { claims: [], total: 0, page, limit }
    }

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (phone) where.phone = phone

    const [claims, total] = await Promise.all([
      db.baggageClaim.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.baggageClaim.count({ where }),
    ])

    return {
      claims,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[baggage-claims.service] getClaims failed:', error)
    }
    throw error
  }
}

// ─────────────────────────────────────────────
// 3. updateClaimStatus — Transition claim status with validation
// ─────────────────────────────────────────────

export async function updateClaimStatus(
  claimId: string,
  status: string,
  options?: {
    resolution?: string
    compensation?: number
    assignedTo?: string
  }
) {
  try {
    if (!claimId) {
      throw new Error('Claim ID is required')
    }

    if (!isValidStatus(status)) {
      throw new Error(
        `Invalid status "${status}". Must be one of: ${VALID_STATUSES.join(', ')}`
      )
    }

    // Verify claim exists
    const existing = await db.baggageClaim.findUnique({ where: { id: claimId } })
    if (!existing) {
      throw new Error(`Claim with id "${claimId}" not found`)
    }

    // Validate transition
    const currentStatus = existing.status
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || []
    if (!allowedNext.includes(status) && currentStatus !== status) {
      throw new Error(
        `Cannot transition claim from "${currentStatus}" to "${status}". Allowed transitions: ${allowedNext.length > 0 ? allowedNext.join(', ') : 'none (terminal state)'}`
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = { status }

    if (options?.resolution !== undefined) updateData.resolution = options.resolution
    if (options?.compensation !== undefined) updateData.compensation = options.compensation
    if (options?.assignedTo !== undefined) updateData.assignedTo = options.assignedTo

    // Auto-set resolvedAt for terminal states
    if (['resolved', 'compensated', 'rejected'].includes(status)) {
      updateData.resolvedAt = new Date()
    }
    // Clear resolvedAt if reopening from rejected back to open
    if (currentStatus === 'rejected' && status === 'open') {
      updateData.resolvedAt = null
    }

    return db.baggageClaim.update({
      where: { id: claimId },
      data: updateData,
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[baggage-claims.service] updateClaimStatus failed:', error)
    }
    throw error
  }
}

// ─────────────────────────────────────────────
// 4. getBaggageStats — Dashboard stats
// ─────────────────────────────────────────────

export async function getBaggageStats(airportCode?: string) {
  try {
    // Active baggage QR codes (not expired, not delivered/collected)
    const activeBagsCount = await db.baggageQR.count({
      where: {
        status: 'active',
        expiresAt: { gt: new Date() },
      },
    })

    // Total baggage QR codes ever registered
    const totalBagsCount = await db.baggageQR.count()

    // Claim counts by status
    const [totalClaims, openClaims, investigatingClaims, resolvedClaims, compensatedClaims, rejectedClaims] =
      await Promise.all([
        db.baggageClaim.count(),
        db.baggageClaim.count({ where: { status: 'open' } }),
        db.baggageClaim.count({ where: { status: 'investigating' } }),
        db.baggageClaim.count({ where: { status: 'resolved' } }),
        db.baggageClaim.count({ where: { status: 'compensated' } }),
        db.baggageClaim.count({ where: { status: 'rejected' } }),
      ])

    // Resolved percentage (resolved + compensated out of total non-open)
    const closedClaims = resolvedClaims + compensatedClaims + rejectedClaims
    const resolvedPercent =
      closedClaims + openClaims + investigatingClaims > 0
        ? Math.round(((resolvedClaims + compensatedClaims) / (closedClaims + openClaims + investigatingClaims)) * 100)
        : 0

    // Average resolution time in hours (for resolved/compensated/rejected claims with resolvedAt)
    const closedClaimsWithDates = await db.baggageClaim.findMany({
      where: {
        status: { in: ['resolved', 'compensated', 'rejected'] },
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    })

    let avgResolutionHours: number | null = null
    if (closedClaimsWithDates.length > 0) {
      const totalMinutes = closedClaimsWithDates.reduce((sum, claim) => {
        return sum + differenceInMinutes(claim.resolvedAt!, claim.createdAt)
      }, 0)
      avgResolutionHours = Math.round((totalMinutes / closedClaimsWithDates.length / 60) * 10) / 10 // 1 decimal
    }

    // Total compensation paid
    const compensationResult = await db.baggageClaim.aggregate({
      where: { status: 'compensated', compensation: { not: null } },
      _sum: { compensation: true },
    })
    const totalCompensation = compensationResult._sum.compensation || 0

    return {
      activeBags: activeBagsCount,
      totalBags: totalBagsCount,
      totalClaims,
      openClaims,
      investigatingClaims,
      resolvedClaims,
      compensatedClaims,
      rejectedClaims,
      resolvedPercent,
      avgResolutionHours,
      totalCompensation,
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[baggage-claims.service] getBaggageStats failed:', error)
    }
    throw error
  }
}

// ─────────────────────────────────────────────
// 5. estimateCarousel — Mock carousel estimate based on flight time
// ─────────────────────────────────────────────

export async function estimateCarousel(flightNumber: string) {
  try {
    if (!flightNumber) {
      throw new Error('Flight number is required')
    }

    // Try to find flight data from FlightStatus table
    const flight = await db.flightStatus.findFirst({
      where: {
        flightNumber: { contains: flightNumber },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (flight) {
      // Use actual arrival time if available, otherwise estimated
      const arrTime = flight.actualArr || flight.estimatedArr || flight.scheduledArr
      const terminal = flight.terminal || null
      const gate = flight.gate || null

      if (arrTime) {
        // Parse HH:MM format
        const [hours, minutes] = arrTime.split(':').map(Number)
        const arrivalDate = new Date()
        arrivalDate.setHours(hours, minutes, 0, 0)

        // Baggage typically arrives 15-30 minutes after landing
        const carouselTime = new Date(arrivalDate.getTime() + 20 * 60 * 1000)
        const carouselHours = carouselTime.getHours().toString().padStart(2, '0')
        const carouselMinutes = carouselTime.getMinutes().toString().padStart(2, '0')

        return {
          flightNumber,
          airline: flight.airline || null,
          arrivalTime: arrTime,
          estimatedCarouselTime: `${carouselHours}:${carouselMinutes}`,
          terminal,
          gate,
          carousel: terminal ? `T${terminal}-BAG` : 'MAIN-BAG',
          status: flight.status,
          confidence: 'high' as const,
        }
      }
    }

    // Fallback: no flight data found, return placeholder
    return {
      flightNumber,
      airline: null,
      arrivalTime: null,
      estimatedCarouselTime: null,
      terminal: null,
      gate: null,
      carousel: null,
      status: 'unknown',
      confidence: 'low' as const,
      message: `Aucune donnée de vol trouvée pour ${flightNumber}. Veuillez vérifier le numéro de vol ou contacter le service bagages.`,
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[baggage-claims.service] estimateCarousel failed:', error)
    }
    throw error
  }
}
