import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createBooking } from '@/lib/services/transport.service'
import { sendTransportConfirmation, sendDriverNotification } from '@/lib/email'
import { parseBody, ValidationError } from '@/lib/validate'

// POST /api/transport/book — Create a transport booking
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 })
    }
    const body = await parseBody(request)

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
      vehicleType,
      paymentMethod,
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
          success: false,
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
      vehicleType: typeof vehicleType === 'string' ? vehicleType : undefined,
      paymentMethod: typeof paymentMethod === 'string' ? paymentMethod : undefined,
    })

    // Send confirmation email to passenger (fire-and-forget)
    if (email && booking.provider) {
      sendTransportConfirmation(email, {
        providerName: booking.provider.name,
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        pickupTime: `${booking.pickupDate} ${booking.pickupTime}`,
        estimatedPrice: String(booking.estimatedPrice ?? booking.totalPrice),
        bookingRef: booking.bookingRef,
      }).catch((err: unknown) => {
        console.error('Failed to send transport confirmation email:', err)
      })
    }

    // Notify driver/dispatch via provider contactEmail (fire-and-forget)
    if (booking.provider) {
      const notifyEmail = booking.provider.contactEmail || ''
      if (notifyEmail) {
        sendDriverNotification(notifyEmail, {
          passengerName,
          passengerPhone: phone,
          pickupLocation: booking.pickupLocation,
          dropoffLocation: booking.dropoffLocation,
          scheduledAt: `${booking.pickupDate} ${booking.pickupTime}`,
          estimatedPrice: String(booking.estimatedPrice ?? booking.totalPrice),
        }).catch((err: unknown) => {
          console.error('Failed to send driver notification:', err)
        })
      }
    }

    return NextResponse.json({ success: true, data: booking }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Error creating transport booking:', error)

    const message =
      error instanceof Error ? error.message : 'Failed to create transport booking'

    // Distinguish known business errors (4xx) from server errors (5xx)
    if (
      message === 'Transport provider not found' ||
      message === 'Transport provider is currently inactive'
    ) {
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }

    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
