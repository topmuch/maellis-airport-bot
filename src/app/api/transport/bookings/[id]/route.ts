import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { updateBookingStatus, assignDriver } from '@/lib/services/transport.service'
import { parseBody, ValidationError } from '@/lib/validate'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/transport/bookings/[id] — Assign driver or update status
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    const body = await parseBody(request)

    // Branch 1: Assign driver — requires driverName, driverPhone, vehiclePlate
    if (body.driverName || body.driverPhone || body.vehiclePlate) {
      if (!body.driverName || !body.driverPhone || !body.vehiclePlate) {
        return NextResponse.json(
          { success: false, error: 'driverName, driverPhone, and vehiclePlate are all required to assign a driver' },
          { status: 400 }
        )
      }

      const booking = await assignDriver(id, {
        name: body.driverName,
        phone: body.driverPhone,
        plate: body.vehiclePlate,
      })

      return NextResponse.json({
        success: true,
        data: booking,
        message: 'Driver assigned successfully',
      })
    }

    // Branch 2: Update status — requires status field
    if (body.status) {
      const booking = await updateBookingStatus(id, body.status)

      return NextResponse.json({
        success: true,
        data: booking,
        message: 'Booking status updated successfully',
      })
    }

    // Neither driver assignment nor status update requested
    return NextResponse.json(
      { success: false, error: 'Must provide either status, or all of driverName/driverPhone/vehiclePlate' },
      { status: 400 }
    )
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Error updating transport booking:', error)

    const internalMessage =
      error instanceof Error ? error.message : ''

    // Known business errors
    if (internalMessage === 'Transport booking not found') {
      return NextResponse.json({ success: false, error: 'Transport booking not found' }, { status: 404 })
    }
    if (internalMessage.includes('Cannot assign driver') || internalMessage.startsWith('Invalid status transition') || internalMessage.startsWith('Invalid status')) {
      return NextResponse.json({ success: false, error: 'Failed to update transport booking' }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
