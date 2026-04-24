import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getPagination, parseBody, ValidationError } from '@/lib/validate'

// GET /api/lounge - List lounge bookings
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 })
    }

    const { searchParams } = new URL(request.url)
    const { page, limit, skip } = getPagination(searchParams)

    const bookings = await db.loungeBooking.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })

    return NextResponse.json({ data: bookings, page, limit })
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
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 })
    }
    const body = await parseBody(request)
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
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error creating lounge booking:', error)
    return NextResponse.json(
      { error: 'Failed to create lounge booking' },
      { status: 500 }
    )
  }
}
