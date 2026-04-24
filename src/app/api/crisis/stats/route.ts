import { NextRequest, NextResponse } from 'next/server'
import { getCrisisStats } from '@/lib/services/crisis-broadcast.service'
import { requireAuth } from '@/lib/auth'

// ─────────────────────────────────────────────
// GET /api/crisis/stats?airportCode=xxx — Crisis statistics for dashboard
// ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 })
    }
    const { searchParams } = new URL(request.url)
    const airportCode = searchParams.get('airportCode') || undefined

    const stats = await getCrisisStats(airportCode)

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('[GET /api/crisis/stats] error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
