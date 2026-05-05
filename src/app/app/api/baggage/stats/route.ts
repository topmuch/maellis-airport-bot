import { NextRequest, NextResponse } from 'next/server'
import { getBaggageStats } from '@/lib/services/baggage-claims.service'
import { requireAuth } from '@/lib/auth'

// GET /api/baggage/stats — Baggage dashboard stats
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const airportCode = searchParams.get('airportCode') || undefined

    const stats = await getBaggageStats(airportCode)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching baggage stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch baggage stats' },
      { status: 500 }
    )
  }
}
