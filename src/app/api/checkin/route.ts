import { NextRequest, NextResponse } from 'next/server'
import {
  getCheckInSessions,
  createCheckInSession,
  getCheckInStats,
} from '@/lib/services/checkin.service'

// GET /api/checkin - List check-in sessions and stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    const stats = searchParams.get('stats')

    // If stats requested, return check-in stats
    if (stats === 'true') {
      const checkinStats = await getCheckInStats()
      return NextResponse.json({ success: true, data: checkinStats })
    }

    // Otherwise, return check-in sessions for a phone
    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'phone query parameter is required' },
        { status: 400 }
      )
    }

    const sessions = await getCheckInSessions(phone)

    return NextResponse.json({ success: true, data: sessions })
  } catch (error) {
    console.error('Error fetching check-in data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch check-in data' },
      { status: 500 }
    )
  }
}

// POST /api/checkin - Create a check-in session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, flightNumber } = body

    if (!phone || !flightNumber) {
      return NextResponse.json(
        { success: false, error: 'phone and flightNumber are required' },
        { status: 400 }
      )
    }

    const session = await createCheckInSession({
      phone,
      flightNumber,
      airline: body.airline,
      pnr: body.pnr,
      passengerName: body.passengerName,
      departureCode: body.departureCode,
      arrivalCode: body.arrivalCode,
      flightDate: body.flightDate,
      checkInUrl: body.checkInUrl,
      seat: body.seat,
      gate: body.gate,
      terminal: body.terminal,
    })

    return NextResponse.json({ success: true, data: session }, { status: 201 })
  } catch (error) {
    console.error('Error creating check-in session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create check-in session' },
      { status: 500 }
    )
  }
}
