import { NextRequest, NextResponse } from 'next/server';
import { getAdRevenue } from '@/lib/services/ad.service';
import { requireRole } from '@/lib/auth';

// ---------------------------------------------------------------------------
// GET /api/admin/ads/revenue?airport=DSS&startDate=2024-01-01&endDate=2024-12-31
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN')
  const authResult = await checkRole(request)
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 })
  }
  try {
    const { searchParams } = new URL(request.url);
    const airportCode = searchParams.get('airport') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // Validate date format if provided
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json(
        { success: false, error: 'startDate must be in YYYY-MM-DD format' },
        { status: 400 },
      );
    }

    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json(
        { success: false, error: 'endDate must be in YYYY-MM-DD format' },
        { status: 400 },
      );
    }

    const revenue = await getAdRevenue(airportCode, startDate, endDate);

    return NextResponse.json({ success: true, data: revenue });
  } catch (error) {
    console.error('[GET /api/admin/ads/revenue] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
