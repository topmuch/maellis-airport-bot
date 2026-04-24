import { NextRequest, NextResponse } from 'next/server'
import { searchDayUse, createDayUseBooking } from '@/lib/services/hotels.service'

// GET /api/hotels - List available day-use hotels
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const airportCode = searchParams.get('airportCode')
    const date = searchParams.get('date')
    const hours = searchParams.get('hours')
    const guests = searchParams.get('guests')
    const maxPrice = searchParams.get('maxPrice')

    if (!airportCode) {
      return NextResponse.json(
        { success: false, error: 'airportCode query parameter is required' },
        { status: 400 }
      )
    }

    const hotels = await searchDayUse({
      airportCode,
      date: date || undefined,
      hours: hours ? parseInt(hours, 10) : undefined,
      guests: guests ? parseInt(guests, 10) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    })

    return NextResponse.json({ success: true, data: hotels })
  } catch (error) {
    console.error('Error searching hotels:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to search hotels' },
      { status: 500 }
    )
  }
}

// POST /api/hotels - Create a day-use booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hotelId, roomId, passengerName, phone, bookingDate, startTime } = body

    if (!hotelId || !roomId || !passengerName || !phone || !bookingDate || !startTime) {
      return NextResponse.json(
        { success: false, error: 'hotelId, roomId, passengerName, phone, bookingDate, and startTime are required' },
        { status: 400 }
      )
    }

    const booking = await createDayUseBooking({
      hotelId,
      roomId,
      passengerName,
      phone,
      email: body.email,
      flightNumber: body.flightNumber,
      bookingDate,
      startTime,
      durationHours: body.durationHours,
      guests: body.guests,
      paymentMethod: body.paymentMethod,
    })

    return NextResponse.json({ success: true, data: booking }, { status: 201 })
  } catch (error) {
    console.error('Error creating hotel booking:', error)
    const message = error instanceof Error ? error.message : 'Failed to create hotel booking'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
