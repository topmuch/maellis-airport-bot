import { NextRequest, NextResponse } from 'next/server';
import {
  getAds,
  createAd,
  VALID_AD_TYPES,
  VALID_PLACEMENTS,
  VALID_AD_STATUSES,
  VALID_BUDGET_TYPES,
} from '@/lib/services/ad.service';

// ---------------------------------------------------------------------------
// GET /api/ads?airport=DSS&placement=home&type=banner&status=active&merchant=xxx
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const airportCode = searchParams.get('airport') || undefined;
    const placement = searchParams.get('placement') || undefined;
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const merchantId = searchParams.get('merchant') || undefined;

    if (placement && !VALID_PLACEMENTS.includes(placement)) {
      return NextResponse.json(
        { success: false, error: `Invalid placement. Must be one of: ${VALID_PLACEMENTS.join(', ')}` },
        { status: 400 },
      );
    }

    if (type && !VALID_AD_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Must be one of: ${VALID_AD_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    if (status && !VALID_AD_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${VALID_AD_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    const ads = await getAds(airportCode, placement, type, status, merchantId);

    return NextResponse.json({
      success: true,
      data: ads,
      count: ads.length,
    });
  } catch (error) {
    console.error('[GET /api/ads] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/ads — Create ad
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields: string[] = ['airportCode', 'title', 'type', 'placement', 'imageUrl', 'startDate', 'endDate', 'budget'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate airport code
    if (!/^[A-Za-z]{3}$/.test(body.airportCode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid airport code. Must be a 3-letter IATA code.' },
        { status: 400 },
      );
    }

    // Validate ad type
    if (!VALID_AD_TYPES.includes(body.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Must be one of: ${VALID_AD_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate placement
    if (!VALID_PLACEMENTS.includes(body.placement)) {
      return NextResponse.json(
        { success: false, error: `Invalid placement. Must be one of: ${VALID_PLACEMENTS.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate dates
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use ISO 8601 format.' },
        { status: 400 },
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate must be before endDate' },
        { status: 400 },
      );
    }

    // Validate budget
    if (typeof body.budget !== 'number' || body.budget <= 0) {
      return NextResponse.json(
        { success: false, error: 'budget must be a positive number' },
        { status: 400 },
      );
    }

    // Validate budget type if provided
    if (body.budgetType && !VALID_BUDGET_TYPES.includes(body.budgetType)) {
      return NextResponse.json(
        { success: false, error: `Invalid budgetType. Must be one of: ${VALID_BUDGET_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate CPM/CPC rates
    if (body.cpmRate !== undefined && (typeof body.cpmRate !== 'number' || body.cpmRate < 0)) {
      return NextResponse.json(
        { success: false, error: 'cpmRate must be a non-negative number' },
        { status: 400 },
      );
    }

    if (body.cpcRate !== undefined && (typeof body.cpcRate !== 'number' || body.cpcRate < 0)) {
      return NextResponse.json(
        { success: false, error: 'cpcRate must be a non-negative number' },
        { status: 400 },
      );
    }

    // Validate targetAudience is valid JSON if provided
    if (body.targetAudience && typeof body.targetAudience !== 'string') {
      body.targetAudience = JSON.stringify(body.targetAudience);
    }

    const ad = await createAd({
      airportCode: body.airportCode,
      campaignId: body.campaignId,
      merchantId: body.merchantId,
      title: body.title,
      description: body.description,
      type: body.type,
      placement: body.placement,
      imageUrl: body.imageUrl,
      videoUrl: body.videoUrl,
      targetUrl: body.targetUrl,
      ctaText: body.ctaText,
      targetAudience: body.targetAudience,
      startDate: body.startDate,
      endDate: body.endDate,
      budget: body.budget,
      budgetType: body.budgetType,
      cpmRate: body.cpmRate,
      cpcRate: body.cpcRate,
    });

    return NextResponse.json(
      { success: true, data: ad },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Authentication required') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }
    console.error('[POST /api/ads] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
