import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdDashboardStats } from '@/lib/services/ad.service';

// ---------------------------------------------------------------------------
// GET /api/admin/ads/stats?airport=DSS — Dashboard stats
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: authResult.status || 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const airportCode = searchParams.get('airport') || undefined;

    const stats = await getAdDashboardStats(airportCode);

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('[GET /api/admin/ads/stats] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
