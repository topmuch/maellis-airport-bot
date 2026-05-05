import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getBookings, createBooking } from '@/lib/services/car-rental.service'
import { getPagination, parseBody, ValidationError } from '@/lib/validate'

// GET /api/car-rental/bookings — List bookings with pagination and status filter
export async function GET(request: NextRequest) {
  try {
    const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT')
    const authResult = await checkRole(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication required' },
        { status: authResult.status || 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const { page, limit } = getPagination(searchParams)
    const status = searchParams.get('status') || undefined

    const result = await getBookings({ status, page, limit })

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
  } catch (error) {
    console.error('[car-rental] Error fetching bookings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch car bookings' },
      { status: 500 }
    )
  }
}

// POST /api/car-rental/bookings — Create booking
export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request)

    if (!body.vehicleId || !body.userPhone || !body.pickupDate || !body.dropoffDate || !body.pickupLocation) {
      return NextResponse.json(
        { success: false, error: 'vehicleId, userPhone, pickupDate, dropoffDate, and pickupLocation are required' },
        { status: 400 }
      )
    }

    const result = await createBooking(body)

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    const message = error instanceof Error ? error.message : 'Failed to create car booking'
    const statusCode = message.includes('not found') ? 404
      : message.includes('not available') ? 409
      : message.includes('Validation failed') ? 400
      : message.includes('must be after') ? 400
      : 500
    console.error('[car-rental] Error creating booking:', error)
    return NextResponse.json({ success: false, error: message }, { status: statusCode })
  }
}
