import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getAds } from '@/lib/services/ad.service';

// ---------------------------------------------------------------------------
// GET /api/admin/ads/pending — Pending ads for approval
// ---------------------------------------------------------------------------
const requireAdmin = requireRole('SUPERADMIN', 'AIRPORT_ADMIN');

export async function GET(request: NextRequest) {
  try {
    // ── Auth & role check (defense-in-depth) ──
    const user = await requireAdmin(request);
    if (!user.success) {
      return NextResponse.json(
        { success: false, error: user.error },
        { status: user.status },
      );
    }

    const { searchParams } = new URL(request.url);
    const airportCode = searchParams.get('airport') || undefined;

    // Enforce airport-scoped access for non-SUPERADMIN users
    if (user.user?.role !== 'SUPERADMIN' && airportCode) {
      const userAirport = user.user?.airportCode;
      if (userAirport && airportCode !== userAirport) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: cannot access other airport data' },
          { status: 403 },
        );
      }
    }

    const ads = await getAds(airportCode, undefined, undefined, 'pending');

    return NextResponse.json({
      success: true,
      data: ads,
      count: ads.length,
    });
  } catch (error) {
    console.error('[GET /api/admin/ads/pending] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
