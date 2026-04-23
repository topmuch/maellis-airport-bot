import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { assignDriver, updateBookingStatus } from '@/lib/services/transport.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/transport/bookings/[id] — Assign driver or update status
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin', 'agent')(request)

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const { id } = await params
    const body = await request.json()

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
    console.error('Error updating transport booking:', error)

    const message =
      error instanceof Error ? error.message : 'Failed to update transport booking'

    // Known business errors
    if (message === 'Transport booking not found') {
      return NextResponse.json({ success: false, error: message }, { status: 404 })
    }
    if (message.includes('Cannot assign driver') || message.startsWith('Invalid status transition') || message.startsWith('Invalid status')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
