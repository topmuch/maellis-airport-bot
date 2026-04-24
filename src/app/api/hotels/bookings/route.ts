import { NextRequest, NextResponse } from 'next/server'
import { getUserBookings, getHotelStats } from '@/lib/services/hotels.service'

// GET /api/hotels/bookings - List bookings and stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    const status = searchParams.get('status')
    const stats = searchParams.get('stats')

    // If stats requested, return hotel stats
    if (stats === 'true') {
      const airportCode = searchParams.get('airportCode') || 'DSS'
      const hotelStats = await getHotelStats(airportCode)
      return NextResponse.json({ success: true, data: hotelStats })
    }

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
