import { NextRequest, NextResponse } from 'next/server';
import { createBooking } from '@/lib/services/lounge.service';
import { sendLoungeConfirmation } from '@/lib/email';

// ---------------------------------------------------------------------------
// POST /api/lounges/book — Create a lounge booking (no auth required for bot)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields: string[] = [
      'loungeId',
      'passengerName',
      'phone',
      'bookingDate',
      'startTime',
    ];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
        },
        { status: 400 },
      );
    }

    // Validate optional fields
    if (body.durationHours !== undefined && (typeof body.durationHours !== 'number' || body.durationHours <= 0)) {
      return NextResponse.json(
        { success: false, error: 'durationHours must be a positive number' },
        { status: 400 },
      );
    }

    if (body.guests !== undefined && (typeof body.guests !== 'number' || body.guests < 1 || !Number.isInteger(body.guests))) {
      return NextResponse.json(
        { success: false, error: 'guests must be a positive integer' },
        { status: 400 },
      );
    }

    if (body.accessLevel !== undefined && !['standard', 'business'].includes(body.accessLevel)) {
      return NextResponse.json(
        { success: false, error: 'accessLevel must be "standard" or "business"' },
        { status: 400 },
      );
    }

    // Validate bookingDate format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.bookingDate)) {
      return NextResponse.json(
        { success: false, error: 'bookingDate must be in YYYY-MM-DD format' },
        { status: 400 },
      );
    }

    // Validate startTime format (HH:mm)
    if (!/^\d{2}:\d{2}$/.test(body.startTime)) {
      return NextResponse.json(
        { success: false, error: 'startTime must be in HH:mm format' },
        { status: 400 },
      );
    }

    // Create the booking via service
    const booking = await createBooking({
      loungeId: body.loungeId,
      passengerName: body.passengerName,
      phone: body.phone,
      email: body.email,
      bookingDate: body.bookingDate,
      startTime: body.startTime,
      durationHours: body.durationHours,
      guests: body.guests,
      accessLevel: body.accessLevel,
    });

    // Send confirmation email if email was provided (non-blocking)
    if (body.email) {
      sendLoungeConfirmation(body.email, {
        loungeName: booking.loungeName,
        location: booking.airportCode,
        date: booking.bookingDate,
        time: booking.startTime,
        guests: booking.guests,
        totalPrice: String(booking.totalPrice),
        bookingRef: booking.bookingRef,
      }).catch((emailError: unknown) => {
        console.error(
          '[POST /api/lounges/book] Failed to send confirmation email:',
          emailError,
        );
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: booking,
        message: 'Lounge booking created successfully',
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Known business-logic errors
      const message = error.message;
      if (
        message === 'Lounge not found' ||
        message === 'Booking not found'
      ) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 404 },
        );
      }

      if (message === 'Lounge is currently closed') {
        return NextResponse.json(
          { success: false, error: message },
          { status: 400 },
        );
      }

      if (message.startsWith('Insufficient capacity')) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 409 },
        );
      }

      if (message === 'Booking is already cancelled') {
        return NextResponse.json(
          { success: false, error: message },
          { status: 400 },
        );
      }
    }

    console.error('[POST /api/lounges/book] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
