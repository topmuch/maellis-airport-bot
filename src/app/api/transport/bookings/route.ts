import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getBookings } from '@/lib/services/transport.service'

// GET /api/transport/bookings?providerId=xxx&status=xxx
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId') ?? undefined
    const status = searchParams.get('status') ?? undefined

    const bookings = await getBookings(providerId, status)

    return NextResponse.json({
      success: true,
      data: bookings,
      count: bookings.length,
    })
  } catch (error) {
    console.error('Error fetching transport bookings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transport bookings' },
      { status: 500 }
    )
  }
}
