import { NextRequest, NextResponse } from 'next/server'
import { fileClaim, getClaims } from '@/lib/services/baggage-claims.service'

// POST /api/baggage/claims — File a new baggage claim
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, passengerName, flightNumber, description, location, baggageId } = body

    if (!phone || !passengerName || !description) {
      return NextResponse.json(
        { error: 'phone, passengerName, and description are required' },
        { status: 400 }
      )
    }

    const claim = await fileClaim({
      phone,
      passengerName,
      flightNumber: flightNumber || undefined,
      description,
      location: location || undefined,
      baggageId: baggageId || undefined,
    })

    return NextResponse.json(claim, { status: 201 })
  } catch (error) {
    console.error('Error filing baggage claim:', error)
    const message = error instanceof Error ? error.message : 'Failed to file baggage claim'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/baggage/claims — List claims with pagination & filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const phone = searchParams.get('phone') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const result = await getClaims({ status, phone, page, limit })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching baggage claims:', error)
    return NextResponse.json(
      { error: 'Failed to fetch baggage claims' },
      { status: 500 }
    )
  }
}
