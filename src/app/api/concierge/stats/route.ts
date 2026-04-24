import { NextRequest, NextResponse } from 'next/server'
import { getTicketStats } from '@/lib/services/concierge.service'

// GET /api/concierge/stats — Concierge ticket statistics
export async function GET() {
  try {
    const stats = await getTicketStats()

    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error('Error fetching concierge stats:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
