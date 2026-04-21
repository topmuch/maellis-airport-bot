import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/transport - List transport bookings
export async function GET() {
  try {
    const bookings = await db.transportBooking.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: bookings })
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
    const body = await request.json()
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
    console.error('Error creating transport booking:', error)
    return NextResponse.json(
      { error: 'Failed to create transport booking' },
      { status: 500 }
    )
  }
}
