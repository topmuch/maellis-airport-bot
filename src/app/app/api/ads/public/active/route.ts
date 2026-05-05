import { NextRequest, NextResponse } from 'next/server';
import { getActiveAds } from '@/lib/services/ad.service';

// ---------------------------------------------------------------------------
// GET /api/ads/public/active?airport=DSS&placement=home&destination=CDG&class=business
// Get active ads for end-user display (PUBLIC, no auth)
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const airportCode = searchParams.get('airport');

    if (!airportCode) {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameter: airport' },
        { status: 400 },
      );
    }

    if (!/^[A-Za-z]{3}$/.test(airportCode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid airport code. Must be a 3-letter IATA code.' },
        { status: 400 },
      );
    }

    const placement = searchParams.get('placement') || undefined;
    const destination = searchParams.get('destination') || undefined;
    const flightClass = searchParams.get('class') || undefined;
    const frequency = searchParams.get('frequency') || undefined;

    // Build context for audience targeting
    const context: Record<string, string> = {};
    if (destination) context.destination = destination;
    if (flightClass) context.flightClass = flightClass;
    if (frequency) context.frequency = frequency;

    const ads = await getActiveAds(
      airportCode,
      placement,
      Object.keys(context).length > 0 ? context : undefined,
    );

    return NextResponse.json({
      success: true,
      data: ads,
      count: ads.length,
    });
  } catch (error) {
    console.error('[GET /api/ads/public/active] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
