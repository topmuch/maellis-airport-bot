import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'

const FLIGHT_SERVICE_URL = 'http://localhost:3006'

// ─────────────────────────────────────────────
// Input validation schemas
// ─────────────────────────────────────────────

const flightsSearchQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const searchFlightsSchema = z.object({
  departureCode: z.string().min(1).max(10),
  arrivalCode: z.string().max(10).optional(),
  date: z.string().max(30).optional(),
  flightNumber: z.string().max(20).optional(),
  passengers: z.number().int().min(1).max(20).optional(),
})

// City name map for common airport codes
const CITY_NAMES: Record<string, string> = {
  DSS: 'Dakar',
  DKR: 'Dakar',
  CDG: 'Paris',
  ORY: 'Paris',
  BRU: 'Brussels',
  NCE: 'Nice',
  LIS: 'Lisbon',
  CMN: 'Casablanca',
  ALG: 'Algiers',
  TUN: 'Tunis',
  JFK: 'New York',
  LHR: 'London',
  DXB: 'Dubai',
  ADD: 'Addis Ababa',
  NBO: 'Nairobi',
  FIH: 'Kinshasa',
  BZV: 'Brazzaville',
  LBV: 'Libreville',
  ABJ: 'Abidjan',
  ACC: 'Accra',
  LOS: 'Lagos',
  MRU: 'Mauritius',
  JNB: 'Johannesburg',
  CAI: 'Cairo',
  IST: 'Istanbul',
  FCO: 'Rome',
  MAD: 'Madrid',
  BCN: 'Barcelona',
  MRS: 'Marseille',
}

function getCityName(code: string): string {
  return CITY_NAMES[code.toUpperCase()] || code
}

// Mock search results
function getMockSearchResults(
  departureCode: string,
  arrivalCode: string,
  _date?: string,
  _flightNumber?: string,
  _passengers?: number
) {
  const airlines = [
    { name: 'Air Sénégal', code: 'HC' },
    { name: 'Air France', code: 'AF' },
    { name: 'Brussels Airlines', code: 'SN' },
    { name: 'Royal Air Maroc', code: 'AT' },
    { name: 'Emirates', code: 'EK' },
    { name: 'Ethiopian Airlines', code: 'ET' },
    { name: 'Turkish Airlines', code: 'TK' },
  ]

  const results = airlines.slice(0, 3 + Math.floor(Math.random() * 3)).map((airline, i) => {
    const hours = 4 + Math.floor(Math.random() * 8)
    const depHour = 6 + i * 3
    const price = 150000 + Math.floor(Math.random() * 350000)
    const stops = Math.random() > 0.6 ? 1 : 0

    return {
      id: `FLT-${Date.now()}-${i}`,
      flightNumber: `${airline.code}${100 + Math.floor(Math.random() * 900)}`,
      airline: airline.name,
      departureCode: departureCode.toUpperCase(),
      arrivalCode: arrivalCode.toUpperCase(),
      departureCity: getCityName(departureCode),
      arrivalCity: getCityName(arrivalCode),
      departureTime: `2025-02-01T${String(depHour).padStart(2, '0')}:00:00Z`,
      arrivalTime: `2025-02-01T${String(depHour + hours).padStart(2, '0')}:00:00Z`,
      duration: `${hours}h${Math.floor(Math.random() * 60)}m`,
      stops,
      price,
      currency: 'XOF',
      seatsAvailable: 2 + Math.floor(Math.random() * 15),
      aircraftType: ['A320', 'B737', 'A330', 'B787'][Math.floor(Math.random() * 4)],
      class: 'Economy',
    }
  })

  return {
    flights: results,
    totalResults: results.length,
    cheapestPrice: Math.min(...results.map((r) => r.price)),
  }
}

// GET /api/flights/search - List flight searches with pagination
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user.success) {
      return NextResponse.json({ error: user.error }, { status: user.status })
    }

    // Validate pagination params
    const rawParams: Record<string, string> = {}
    request.nextUrl.searchParams.forEach((value, key) => {
      rawParams[key] = value
    })
    const parsed = flightsSearchQuerySchema.safeParse(rawParams)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { page, limit } = parsed.data
    const skip = (page - 1) * limit

    const [flights, total] = await Promise.all([
      db.flightSearch.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.flightSearch.count(),
    ])

    return NextResponse.json({
      success: true,
      data: flights,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching flight searches:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch flight searches' },
      { status: 500 }
    )
  }
}

// POST /api/flights/search - Search flights
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
    const parsed = searchFlightsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { departureCode, arrivalCode, date, flightNumber, passengers } = parsed.data

    const depCode = departureCode.toUpperCase().trim()
    const arrCode = arrivalCode ? arrivalCode.toUpperCase().trim() : ''
    const depCity = getCityName(depCode)
    const arrCity = arrCode ? getCityName(arrCode) : ''

    // Step 1: Try flight-service proxy
    let serviceData: unknown = null
    try {
      const serviceBody: Record<string, unknown> = {
        departureCode: depCode,
      }
      if (arrCode) serviceBody.arrivalCode = arrCode
      if (date) serviceBody.date = date
      if (flightNumber) serviceBody.flightNumber = flightNumber
      if (passengers) serviceBody.passengers = passengers

      const response = await fetch(`${FLIGHT_SERVICE_URL}/api/flight/search`, {
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
      console.warn('flight-service (port 3006) unavailable, using fallback for search')
    }

    // Step 2: Determine data source
    let searchData: Record<string, unknown>

    if (serviceData) {
      searchData = (serviceData as Record<string, unknown>).data
        ? (serviceData as Record<string, unknown>).data as Record<string, unknown>
        : serviceData as Record<string, unknown>
    } else {
      // Fallback to mock data
      searchData = getMockSearchResults(depCode, arrCode, date, flightNumber, passengers)
    }

    // Step 3: Save search to DB
    const flights = (searchData.flights as unknown[]) || []
    const cheapestPrice = (searchData.cheapestPrice as number) || null
    const firstFlight = flights[0] as Record<string, unknown> | undefined
    const airline = (firstFlight?.airline as string) || null

    await db.flightSearch.create({
      data: {
        id: `fs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        departureCode: depCode,
        arrivalCode: arrCode || '',
        departureCity: depCity,
        arrivalCity: arrCity || '',
        travelDate: date || null,
        passengers: passengers || 1,
        results: JSON.stringify(flights),
        cheapestPrice,
        airline,
        status: 'completed',
      },
    })

    return NextResponse.json({
      success: true,
      data: searchData,
      message: `Found ${(searchData.totalResults as number) || flights.length || 0} flights`,
    })
  } catch (error) {
    console.error('Error searching flights:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to search flights' },
      { status: 500 }
    )
  }
}
