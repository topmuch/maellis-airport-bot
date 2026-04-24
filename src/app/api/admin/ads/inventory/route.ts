import { NextRequest, NextResponse } from 'next/server';
import { getAdInventory } from '@/lib/services/ad.service';
import { requireRole } from '@/lib/auth';

// ---------------------------------------------------------------------------
// GET /api/admin/ads/inventory?airport=DSS — Ad inventory report
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
