import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getBookingById } from '@/lib/services/car-rental.service'

// GET /api/car-rental/bookings/[id] — Single booking detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT')
    const authResult = await checkRole(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication required' },
        { status: authResult.status || 401 }
      )
    }

    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    const booking = await getBookingById(id)

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Car booking not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: booking })
  } catch (error) {
    console.error('[car-rental] Error fetching booking:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch car booking' },
      { status: 500 }
    )
  }
}
