import { NextRequest, NextResponse } from 'next/server'
import { getUserBookings, getHotelStats } from '@/lib/services/hotels.service'
import { requireAuth, requireRole } from '@/lib/auth'

// GET /api/hotels/bookings - List bookings and stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stats = searchParams.get('stats')

    // Stats endpoint requires admin role
    if (stats === 'true') {
      const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request)
      if (!authResult.success) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
      }
      const airportCode = searchParams.get('airportCode') || 'DSS'
      const hotelStats = await getHotelStats(airportCode)
      return NextResponse.json({ success: true, data: hotelStats })
    }

    // Booking listing requires auth
    const authResult = await requireAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const phone = searchParams.get('phone')
    const status = searchParams.get('status')

    // Otherwise, return user bookings
    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'phone query parameter is required' },
        { status: 400 }
      )
    }

    const bookings = await getUserBookings(phone)

    // Filter by status if provided
    const filtered = status
      ? bookings.filter((b) => b.status === status)
      : bookings

    return NextResponse.json({ success: true, data: filtered })
  } catch (error) {
    console.error('Error fetching hotel bookings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hotel bookings' },
      { status: 500 }
    )
  }
}
