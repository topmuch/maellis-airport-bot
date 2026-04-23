import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getCampaigns,
  createCampaign,
  VALID_CAMPAIGN_STATUSES,
} from '@/lib/services/ad.service';

// ---------------------------------------------------------------------------
// GET /api/ads/campaigns?airport=DSS&status=active — List campaigns
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status },
      );
    }

    const { searchParams } = new URL(request.url);
    const airportCode = searchParams.get('airport') || undefined;
    const status = searchParams.get('status') || undefined;

    if (status && !VALID_CAMPAIGN_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${VALID_CAMPAIGN_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    const campaigns = await getCampaigns(airportCode, status);

    return NextResponse.json({
      success: true,
      data: campaigns,
      count: campaigns.length,
    });
  } catch (error) {
    console.error('[GET /api/ads/campaigns] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/ads/campaigns — Create campaign (auth required)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: authResult.status || 401 },
      );
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields: string[] = ['airportCode', 'name', 'startDate', 'endDate', 'totalBudget'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate airport code format
    if (!/^[A-Za-z]{3}$/.test(body.airportCode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid airport code. Must be a 3-letter IATA code.' },
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
    if (typeof body.totalBudget !== 'number' || body.totalBudget <= 0) {
      return NextResponse.json(
        { success: false, error: 'totalBudget must be a positive number' },
        { status: 400 },
      );
    }

    const campaign = await createCampaign({
      airportCode: body.airportCode,
      name: body.name,
      description: body.description,
      startDate: body.startDate,
      endDate: body.endDate,
      totalBudget: body.totalBudget,
    });

    return NextResponse.json(
      { success: true, data: campaign },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Authentication required') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }
    console.error('[POST /api/ads/campaigns] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
