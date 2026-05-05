import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import {
  getCheckinAnalyticsOverview,
  getCheckinDailyStats,
  getCheckinAirlineStats,
} from '@/lib/checkin-analytics.service'

// ── GET /api/admin/analytics/checkin ────────────────────────────────────────
// Statistiques d'analytics pour le module check-in / deep linking.
// Accessible uniquement aux rôles SUPERADMIN et AIRPORT_ADMIN.
//
// Paramètres query :
//   view=overview  → stats globales (défaut)
//   view=daily&days=30  → série temporelle par jour
//   view=airlines&limit=20  → stats par compagnie
export async function GET(request: NextRequest) {
  // Auth check
  const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN')
  const authResult = await checkRole(request)
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error || 'Accès refusé' },
      { status: authResult.status || 401 },
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'overview'

    switch (view) {
      case 'daily': {
        const daysParam = searchParams.get('days')
        const days = Math.min(90, Math.max(1, Number(daysParam) || 30))
        const dailyStats = await getCheckinDailyStats(days)
        return NextResponse.json({ success: true, data: dailyStats })
      }

      case 'airlines': {
        const limitParam = searchParams.get('limit')
        const limit = Math.min(50, Math.max(1, Number(limitParam) || 20))
        const airlineStats = await getCheckinAirlineStats(limit)
        return NextResponse.json({ success: true, data: airlineStats })
      }

      case 'overview':
      default: {
        const overview = await getCheckinAnalyticsOverview()
        return NextResponse.json({ success: true, data: overview })
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne'
    console.error('[admin/analytics/checkin] GET error:', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}
