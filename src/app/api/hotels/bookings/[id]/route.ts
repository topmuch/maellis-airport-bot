import { NextRequest, NextResponse } from 'next/server'
import { cancelBooking } from '@/lib/services/hotels.service'
import { requireAuth } from '@/lib/auth'

// DELETE /api/hotels/bookings/[id] - Cancel a booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
  }

  try {
    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

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
    return NextResponse.json(
      { success: false, error: 'Failed to cancel hotel booking' },
      { status: 500 }
    )
  }
}
