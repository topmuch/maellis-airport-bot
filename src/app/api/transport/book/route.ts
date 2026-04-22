import { NextRequest, NextResponse } from 'next/server'
import { createBooking } from '@/lib/services/transport.service'
import { sendTransportConfirmation, sendDriverNotification } from '@/lib/email'

// POST /api/transport/book — Create a transport booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      providerId,
      passengerName,
      phone,
      email,
      pickupLocation,
      dropoffLocation,
      pickupDate,
      pickupTime,
      passengers,
      distanceKm,
    } = body

    // Validate required fields
    if (
      !providerId ||
      !passengerName ||
      !phone ||
      !pickupLocation ||
      !dropoffLocation ||
      !pickupDate ||
      !pickupTime
    ) {
      return NextResponse.json(
        {
          error:
            'providerId, passengerName, phone, pickupLocation, dropoffLocation, pickupDate, and pickupTime are required',
        },
        { status: 400 }
      )
    }

    const booking = await createBooking({
      providerId,
      passengerName,
      phone,
      email: typeof email === 'string' ? email : undefined,
      pickupLocation,
      dropoffLocation,
      pickupDate,
      pickupTime,
      passengers: typeof passengers === 'number' ? passengers : undefined,
      distanceKm: typeof distanceKm === 'number' ? distanceKm : undefined,
    })

    // Send confirmation email to passenger (fire-and-forget)
    if (email) {
      sendTransportConfirmation(email, {
        providerName: booking.provider?.name ?? '',
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        pickupTime: booking.pickupTime,
        estimatedPrice: String(booking.estimatedPrice ?? booking.totalPrice),
        bookingRef: booking.bookingRef,
      }).catch((err: unknown) => {
        console.error('Failed to send transport confirmation email:', err)
      })
    }

    // Notify driver/dispatch via provider contacts (fire-and-forget)
    if (booking.provider?.contacts) {
      try {
        const contacts = JSON.parse(booking.provider.contacts)
        sendDriverNotification(contacts.email || contacts.phone || '', {
          passengerName,
          passengerPhone: phone,
          pickupLocation: booking.pickupLocation,
          dropoffLocation: booking.dropoffLocation,
          scheduledAt: `${booking.pickupDate} ${booking.pickupTime}`,
          estimatedPrice: String(booking.estimatedPrice ?? booking.totalPrice),
        }).catch((err: unknown) => {
          console.error('Failed to send driver notification:', err)
        })
      } catch {
        console.error('Failed to parse provider contacts JSON for notification')
      }
    }

    return NextResponse.json({ data: booking }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating transport booking:', error)

    const message =
      error instanceof Error ? error.message : 'Failed to create transport booking'

    // Distinguish known business errors (4xx) from server errors (5xx)
    if (
      message === 'Transport provider not found' ||
      message === 'Transport provider is currently inactive'
    ) {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
