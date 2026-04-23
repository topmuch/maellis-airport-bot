import { NextRequest, NextResponse } from 'next/server';
import { trackClick } from '@/lib/services/ad.service';

// ---------------------------------------------------------------------------
// POST /api/ads/track/click — Track ad click (PUBLIC, no auth)
// Body: { impressionId, conversionValue? }
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

    const click = await trackClick(body.impressionId, {
      conversionValue: body.conversionValue,
    });

    return NextResponse.json({
      success: true,
      data: {
        clickId: click.id,
        timestamp: click.timestamp,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Impression not found') {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 });
      }
    }
    console.error('[POST /api/ads/track/click] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
