import { NextRequest, NextResponse } from 'next/server'
import { getBaggageStats } from '@/lib/services/baggage-claims.service'

// GET /api/baggage/stats — Baggage dashboard stats
export async function GET(request: NextRequest) {
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
