import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdRevenue } from '@/lib/services/ad.service';

// ---------------------------------------------------------------------------
// GET /api/admin/ads/revenue?airport=DSS&startDate=2024-01-01&endDate=2024-12-31
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
