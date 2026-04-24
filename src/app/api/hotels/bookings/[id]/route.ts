import { NextRequest, NextResponse } from 'next/server'
import { cancelBooking } from '@/lib/services/hotels.service'

// DELETE /api/hotels/bookings/[id] - Cancel a booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'reason is required to cancel a booking' },
        { status: 400 }
      )
    }

    const result = await cancelBooking(id, reason)

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error cancelling hotel booking:', error)
    const message = error instanceof Error ? error.message : 'Failed to cancel hotel booking'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
