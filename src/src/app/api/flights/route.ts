import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'

// ─────────────────────────────────────────────
// Input validation schemas
// ─────────────────────────────────────────────

const flightsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const createFlightSearchSchema = z.object({
  departureCode: z.string().min(1).max(10),
  arrivalCode: z.string().min(1).max(10),
  departureCity: z.string().min(1).max(100),
  arrivalCity: z.string().min(1).max(100),
  travelDate: z.string().datetime({ offset: true }).nullable().optional(),
  passengers: z.number().int().min(1).max(20).optional().default(1),
  resultsCount: z.number().int().min(0).optional().default(0),
  cheapestPrice: z.number().min(0).nullable().optional(),
  airline: z.string().max(100).nullable().optional(),
  status: z.enum(['pending', 'searching', 'completed', 'failed', 'cancelled']).optional().default('completed'),
})

// GET /api/flights - List flight searches with pagination
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
    const parsed = flightsQuerySchema.safeParse(rawParams)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.issues },
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
      data: flights,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching flights:', error)
    return NextResponse.json(
      { error: 'Failed to fetch flights' },
      { status: 500 }
    )
  }
}

// POST /api/flights - Create new flight search
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
    const parsed = createFlightSearchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data

    const flightSearch = await db.flightSearch.create({
      data: {
        id: `fs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        departureCode: data.departureCode,
        arrivalCode: data.arrivalCode,
        departureCity: data.departureCity,
        arrivalCity: data.arrivalCity,
        travelDate: data.travelDate ?? null,
        passengers: data.passengers,
        results: JSON.stringify([]),
        cheapestPrice: data.cheapestPrice,
        airline: data.airline,
        status: data.status,
      },
    })

    return NextResponse.json(flightSearch, { status: 201 })
  } catch (error) {
    console.error('Error creating flight search:', error)
    return NextResponse.json(
      { error: 'Failed to create flight search' },
      { status: 500 }
    )
  }
}
