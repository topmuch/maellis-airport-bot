import { NextRequest, NextResponse } from 'next/server';
import { trackConversion } from '@/lib/services/ad.service';

// ---------------------------------------------------------------------------
// POST /api/ads/track/conversion — Track ad conversion (PUBLIC, no auth)
// Body: { impressionId, conversionValue }
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.impressionId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: impressionId' },
        { status: 400 },
      );
    }

    if (body.conversionValue === undefined || typeof body.conversionValue !== 'number' || body.conversionValue < 0) {
      return NextResponse.json(
        { success: false, error: 'conversionValue must be a non-negative number' },
        { status: 400 },
      );
    }

    const result = await trackConversion(body.impressionId, body.conversionValue);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Impression not found') {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 });
      }
      if (error.message === 'No unconverted click found for this impression') {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
    }
    console.error('[POST /api/ads/track/conversion] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
