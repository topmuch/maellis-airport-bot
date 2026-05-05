import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getFlightProvider } from '@/lib/flight-providers'

const FLIGHT_SERVICE_URL = 'http://localhost:3006'

// ─────────────────────────────────────────────
// Input validation schemas
// ─────────────────────────────────────────────

const VALID_FLIGHT_STATUSES = [
  'scheduled',
  'boarding',
  'departed',
  'in_flight',
  'landed',
  'arrived',
  'delayed',
  'cancelled',
  'diverted',
] as const

const flightStatusQuerySchema = z.object({
  status: z.string().max(200).optional(),
  search: z.string().max(20).optional(),
})

const flightStatusBodySchema = z.object({
  flightNumber: z.string().min(1).max(20),
  date: z.string().max(30).optional(),
})

// Mock flight status data used as fallback
function getMockFlightStatus(flightNumber: string): Record<string, unknown> {
  const mockData: Record<string, unknown> = {
    'AF123': {
      flightNumber: 'AF123',
      airline: 'Air France',
      departureCode: 'DSS',
      arrivalCode: 'CDG',
      departureCity: 'Dakar',
      arrivalCity: 'Paris',
      scheduledDep: '2025-01-15T08:30:00Z',
      scheduledArr: '2025-01-15T18:45:00Z',
      estimatedDep: '2025-01-15T09:15:00Z',
      estimatedArr: '2025-01-15T19:30:00Z',
      actualDep: null,
      actualArr: null,
      gate: 'A12',
      terminal: 'T1',
      status: 'delayed',
      delayMinutes: 45,
      aircraft: 'F-GSPK',
      aircraftType: 'A330-200',
    },
    'SN201': {
      flightNumber: 'SN201',
      airline: 'Brussels Airlines',
      departureCode: 'DSS',
      arrivalCode: 'BRU',
      departureCity: 'Dakar',
      arrivalCity: 'Brussels',
      scheduledDep: '2025-01-15T22:00:00Z',
      scheduledArr: '2025-01-16T06:30:00Z',
      estimatedDep: '2025-01-15T22:00:00Z',
      estimatedArr: '2025-01-16T06:30:00Z',
      actualDep: null,
      actualArr: null,
      gate: 'B05',
      terminal: 'T2',
      status: 'scheduled',
      delayMinutes: 0,
      aircraft: 'OO-SFP',
      aircraftType: 'A330-300',
    },
  }

  const cached = mockData[flightNumber] as Record<string, unknown> | undefined
  if (cached) return cached

  // Generate generic mock data for unknown flights
  return {
    flightNumber,
    airline: 'Unknown Airline',
    departureCode: 'DSS',
    arrivalCode: 'NCE',
    departureCity: 'Dakar',
    arrivalCity: 'Nice',
    scheduledDep: '2025-01-15T14:00:00Z',
    scheduledArr: '2025-01-15T22:00:00Z',
    estimatedDep: '2025-01-15T14:00:00Z',
    estimatedArr: '2025-01-15T22:00:00Z',
    actualDep: null,
    actualArr: null,
    gate: 'C03',
    terminal: 'T1',
    status: 'scheduled',
    delayMinutes: 0,
    aircraft: null,
    aircraftType: 'B737-800',
  }
}

// GET /api/flights/status - List flight statuses with optional filters
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user.success) {
      return NextResponse.json({ error: user.error }, { status: user.status })
    }

    // Validate and sanitize query parameters
    const rawParams: Record<string, string> = {}
    request.nextUrl.searchParams.forEach((value, key) => {
      rawParams[key] = value
    })
    const parsed = flightStatusQuerySchema.safeParse(rawParams)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { status: statusFilter, search } = parsed.data

    const where: Record<string, unknown> = {}

    if (statusFilter) {
      // Sanitize: only allow known status values
      const statuses = statusFilter
        .split(',')
        .map((s) => s.trim())
        .filter((s) => (VALID_FLIGHT_STATUSES as readonly string[]).includes(s))
      if (statuses.length > 0) {
        where.status = { in: statuses }
      }
    }

    if (search) {
      // Sanitize: escape Prisma special chars for contains search
      const sanitized = search.replace(/[%_\\]/g, '\\$&')
      where.flightNumber = { contains: sanitized.toUpperCase() }
    }

    const statuses = await db.flightStatus.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: statuses,
      count: statuses.length,
    })
  } catch (error) {
    console.error('Error fetching flight statuses:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch flight statuses' },
      { status: 500 }
    )
  }
}

// POST /api/flights/status - Get single flight status
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user.success) {
      return NextResponse.json({ error: user.error }, { status: user.status })
    }

    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const parsed = flightStatusBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { flightNumber, date } = parsed.data
    const normalizedFlight = flightNumber.toUpperCase().trim()

    // Step 1: Check DB for existing record
    const existing = await db.flightStatus.findFirst({
      where: { flightNumber: normalizedFlight },
    })

    // Step 1.5: Try configurable flight provider (API-agnostic)
    try {
      const provider = await getFlightProvider()
      const providerData = await provider.getFlightStatus({ flightNumber: normalizedFlight, date })

      // Provider succeeded — upsert to DB using same logic
      const providerRecord = {
        flightNumber: providerData.flightNumber || normalizedFlight,
        airline: providerData.airline || '',
        departureCode: providerData.departureCode || '',
        arrivalCode: providerData.arrivalCode || '',
        scheduledDep: providerData.scheduledDep || null,
        scheduledArr: providerData.scheduledArr || null,
        estimatedDep: providerData.estimatedDep || null,
        estimatedArr: providerData.estimatedArr || null,
        actualDep: providerData.actualDep || null,
        actualArr: providerData.actualArr || null,
        gate: providerData.gate || null,
        terminal: providerData.terminal || null,
        status: providerData.status || 'scheduled',
        delayMinutes: providerData.delayMinutes || 0,
        aircraft: providerData.aircraft || null,
        departureCity: providerData.departureCity || null,
        arrivalCity: providerData.arrivalCity || null,
        aircraftType: providerData.aircraftType || null,
      }

      if (existing) {
        await db.flightStatus.update({
          where: { id: existing.id },
          data: providerRecord,
        })
      } else {
        await db.flightStatus.create({
          data: {
            ...providerRecord,
            id: `fst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            updatedAt: new Date(),
          },
        })
      }

      return NextResponse.json({
        success: true,
        data: providerData,
        message: `Status retrieved for ${normalizedFlight}`,
      })
    } catch (providerErr) {
      // Provider failed, log and continue to flight-service fallback
      if (process.env.NODE_ENV === 'development') {
        console.warn('[flights/status] Configurable provider failed, falling back:', providerErr)
      }
    }

    // Step 2: Try flight-service proxy
    let serviceData: unknown = null
    try {
      const serviceBody: Record<string, string> = { flightNumber: normalizedFlight }
      if (date) serviceBody.date = date

      const response = await fetch(`${FLIGHT_SERVICE_URL}/api/flight/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceBody),
        signal: AbortSignal.timeout(15000),
      })

      if (response.ok) {
        serviceData = await response.json()
      }
    } catch {
      // flight-service unavailable, continue with fallback
      console.warn('flight-service (port 3006) unavailable, using fallback')
    }

    // Step 3: Determine data source
    let flightData: Record<string, unknown>

    if (serviceData) {
      // Use service data, flatten if wrapped
      flightData = (serviceData as Record<string, unknown>).data
        ? (serviceData as Record<string, unknown>).data as Record<string, unknown>
        : serviceData as Record<string, unknown>
    } else if (existing) {
      flightData = existing as unknown as Record<string, unknown>
    } else {
      // Fallback to mock data
      flightData = getMockFlightStatus(normalizedFlight)
    }

    // Step 4: Upsert to DB
    const flightRecord = {
      flightNumber: (flightData.flightNumber as string) || normalizedFlight,
      airline: (flightData.airline as string) || '',
      departureCode: (flightData.departureCode as string) || '',
      arrivalCode: (flightData.arrivalCode as string) || '',
      scheduledDep: (flightData.scheduledDep as string) || null,
      scheduledArr: (flightData.scheduledArr as string) || null,
      estimatedDep: (flightData.estimatedDep as string) || null,
      estimatedArr: (flightData.estimatedArr as string) || null,
      actualDep: (flightData.actualDep as string) || null,
      actualArr: (flightData.actualArr as string) || null,
      gate: (flightData.gate as string) || null,
      terminal: (flightData.terminal as string) || null,
      status: (flightData.status as string) || 'scheduled',
      delayMinutes: (flightData.delayMinutes as number) || 0,
      aircraft: (flightData.aircraft as string) || null,
      departureCity: (flightData.departureCity as string) || null,
      arrivalCity: (flightData.arrivalCity as string) || null,
      aircraftType: (flightData.aircraftType as string) || null,
    }

    if (existing) {
      await db.flightStatus.update({
        where: { id: existing.id },
        data: flightRecord,
      })
    } else {
      await db.flightStatus.create({
        data: {
          ...flightRecord,
          id: `fst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          updatedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: flightData,
      message: `Status retrieved for ${normalizedFlight}`,
    })
  } catch (error) {
    console.error('Error fetching flight status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch flight status' },
      { status: 500 }
    )
  }
}
