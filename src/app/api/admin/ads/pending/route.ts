import { NextRequest, NextResponse } from 'next/server';
import { getAds } from '@/lib/services/ad.service';

// ---------------------------------------------------------------------------
// GET /api/admin/ads/pending — Pending ads for approval
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const airportCode = searchParams.get('airport') || undefined;

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
