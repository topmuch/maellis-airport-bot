import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getPagination, parseBody, ValidationError } from '@/lib/validate'

// GET /api/transport - List transport bookings
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 })
    }

    const { searchParams } = new URL(request.url)
    const { page, limit, skip } = getPagination(searchParams)

    const bookings = await db.transportBooking.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })

    return NextResponse.json({ data: bookings, page, limit })
  } catch (error) {
    console.error('Error fetching transport bookings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transport bookings' },
      { status: 500 }
    )
  }
}

// POST /api/transport - Create new transport booking
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
      vehicleType,
      pickupLocation,
      dropoffLocation,
      pickupDate,
      pickupTime,
      passengers,
      totalPrice,
      paymentMethod,
      paymentStatus,
      bookingRef,
      driverName,
      driverPhone,
      vehiclePlate,
      status,
    } = body

    if (!passengerName || !phone || !vehicleType || !pickupLocation || !dropoffLocation || !pickupDate || !pickupTime || !totalPrice || !bookingRef) {
      return NextResponse.json(
        { error: 'passengerName, phone, vehicleType, pickupLocation, dropoffLocation, pickupDate, pickupTime, totalPrice, and bookingRef are required' },
        { status: 400 }
      )
    }

    const booking = await db.transportBooking.create({
      data: {
        passengerName,
        phone,
        vehicleType,
        pickupLocation,
        dropoffLocation,
        pickupDate,
        pickupTime,
        passengers: passengers || 1,
        totalPrice,
        paymentMethod: paymentMethod || null,
        paymentStatus: paymentStatus || 'pending',
        bookingRef,
        driverName: driverName || null,
        driverPhone: driverPhone || null,
        vehiclePlate: vehiclePlate || null,
        status: status || 'pending',
      },
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error creating transport booking:', error)
    return NextResponse.json(
      { error: 'Failed to create transport booking' },
      { status: 500 }
    )
  }
}
