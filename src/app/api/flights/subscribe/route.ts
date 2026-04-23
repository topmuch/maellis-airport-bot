import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/flights/subscribe - Subscribe to flight notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { flightNumber, phone, events } = body

    if (!flightNumber || !phone) {
      return NextResponse.json(
        { success: false, error: 'flightNumber and phone are required' },
        { status: 400 }
      )
    }

    const normalizedFlight = flightNumber.toUpperCase().trim()
    const normalizedPhone = phone.trim()
    const eventsString = Array.isArray(events) ? events.join(',') : (events || 'delay,gate_change,cancellation')

    // Check for existing active subscription
    const existing = await db.flightSubscription.findFirst({
      where: {
        flightNumber: normalizedFlight,
        phone: normalizedPhone,
        isActive: true,
      },
    })

    if (existing) {
      // Update existing subscription events
      const updated = await db.flightSubscription.update({
        where: { id: existing.id },
        data: { events: eventsString },
      })

      return NextResponse.json({
        success: true,
        data: updated,
        message: `Subscription updated for ${normalizedFlight}`,
      })
    }

    // Create new subscription
    const subscription = await db.flightSubscription.create({
      data: {
        flightNumber: normalizedFlight,
        phone: normalizedPhone,
        events: eventsString,
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: subscription,
      message: `Subscribed to notifications for ${normalizedFlight}`,
    })
  } catch (error) {
    console.error('Error creating subscription:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}

// DELETE /api/flights/subscribe - Unsubscribe from flight notifications
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { flightNumber, phone } = body

    if (!flightNumber || !phone) {
      return NextResponse.json(
        { success: false, error: 'flightNumber and phone are required' },
        { status: 400 }
      )
    }

    const normalizedFlight = flightNumber.toUpperCase().trim()
    const normalizedPhone = phone.trim()

    // Find and deactivate subscription
    const existing = await db.flightSubscription.findFirst({
      where: {
        flightNumber: normalizedFlight,
        phone: normalizedPhone,
        isActive: true,
      },
    })

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: 'No active subscription found',
      }, { status: 404 })
    }

    await db.flightSubscription.update({
      where: { id: existing.id },
      data: { isActive: false },
    })

    return NextResponse.json({
      success: true,
      message: `Unsubscribed from notifications for ${normalizedFlight}`,
    })
  } catch (error) {
    console.error('Error deleting subscription:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete subscription' },
      { status: 500 }
    )
  }
}
