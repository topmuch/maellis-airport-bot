import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/lounge - List lounge bookings
export async function GET() {
  try {
    const bookings = await db.loungeBooking.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: bookings })
  } catch (error) {
    console.error('Error fetching lounge bookings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lounge bookings' },
      { status: 500 }
    )
  }
}

// POST /api/lounge - Create new lounge booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      passengerName,
      phone,
      email,
      loungeName,
      airportCode,
      guests,
      bookingDate,
      startTime,
      durationHours,
      totalPrice,
      paymentMethod,
      paymentStatus,
      bookingRef,
      status,
    } = body

    if (!passengerName || !phone || !loungeName || !airportCode || !bookingDate || !startTime || !totalPrice || !bookingRef) {
      return NextResponse.json(
        { error: 'passengerName, phone, loungeName, airportCode, bookingDate, startTime, totalPrice, and bookingRef are required' },
        { status: 400 }
      )
    }

    const booking = await db.loungeBooking.create({
      data: {
        passengerName,
        phone,
        email: email || null,
        loungeName,
        airportCode,
        guests: guests || 1,
        bookingDate,
        startTime,
        durationHours: durationHours || 3,
        totalPrice,
        paymentMethod: paymentMethod || null,
        paymentStatus: paymentStatus || 'pending',
        bookingRef,
        status: status || 'confirmed',
      },
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error('Error creating lounge booking:', error)
    return NextResponse.json(
      { error: 'Failed to create lounge booking' },
      { status: 500 }
    )
  }
}
