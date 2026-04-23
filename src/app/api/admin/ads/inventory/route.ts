import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdInventory } from '@/lib/services/ad.service';

// ---------------------------------------------------------------------------
// GET /api/admin/ads/inventory?airport=DSS — Ad inventory report
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

    const inventory = await getAdInventory(airportCode);

    return NextResponse.json({ success: true, data: inventory });
  } catch (error) {
    console.error('[GET /api/admin/ads/inventory] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
