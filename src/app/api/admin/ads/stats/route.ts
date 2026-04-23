import { NextRequest, NextResponse } from 'next/server';
import { getAdDashboardStats } from '@/lib/services/ad.service';

// ---------------------------------------------------------------------------
// GET /api/admin/ads/stats?airport=DSS — Dashboard stats
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
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
