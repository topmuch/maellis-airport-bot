import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/flights - List flight searches with pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
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
    const body = await request.json()
    const {
      departureCode,
      arrivalCode,
      departureCity,
      arrivalCity,
      travelDate,
      passengers,
      resultsCount,
      cheapestPrice,
      airline,
      status,
    } = body

    if (!departureCode || !arrivalCode || !departureCity || !arrivalCity) {
      return NextResponse.json(
        { error: 'departureCode, arrivalCode, departureCity, and arrivalCity are required' },
        { status: 400 }
      )
    }

    const flightSearch = await db.flightSearch.create({
      data: {
        departureCode,
        arrivalCode,
        departureCity,
        arrivalCity,
        travelDate: travelDate || null,
        passengers: passengers || 1,
        resultsCount: resultsCount || 0,
        cheapestPrice: cheapestPrice ?? null,
        airline: airline || null,
        status: status || 'completed',
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
