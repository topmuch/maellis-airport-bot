import { NextRequest, NextResponse } from 'next/server';
import { trackImpression } from '@/lib/services/ad.service';

// ---------------------------------------------------------------------------
// POST /api/ads/track/impression — Track ad impression (PUBLIC, no auth)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields: string[] = ['advertisementId', 'placement'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate placement
    const validPlacements = ['home', 'between_messages', 'bottom_banner', 'search_results', 'flight_status'];
    if (!validPlacements.includes(body.placement)) {
      return NextResponse.json(
        { success: false, error: `Invalid placement. Must be one of: ${validPlacements.join(', ')}` },
        { status: 400 },
      );
    }

    // Normalize optional fields
    let deviceInfo = body.deviceInfo;
    if (deviceInfo && typeof deviceInfo === 'object') {
      deviceInfo = JSON.stringify(deviceInfo);
    }

    let location = body.location;
    if (location && typeof location === 'object') {
      location = JSON.stringify(location);
    }

    const impression = await trackImpression({
      advertisementId: body.advertisementId,
      sessionId: body.sessionId,
      placement: body.placement,
      deviceInfo,
      location,
    });

    return NextResponse.json({
      success: true,
      data: {
        impressionId: impression.id,
        timestamp: impression.timestamp,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Advertisement not found') {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 });
      }
    }
    console.error('[POST /api/ads/track/impression] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
