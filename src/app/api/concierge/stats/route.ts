import { NextRequest, NextResponse } from 'next/server'
import { getTicketStats } from '@/lib/services/concierge.service'
import { requireAuth } from '@/lib/auth'

// GET /api/concierge/stats — Concierge ticket statistics
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
  }

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
