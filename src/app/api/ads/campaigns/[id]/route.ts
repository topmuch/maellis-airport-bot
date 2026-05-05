import { NextRequest, NextResponse } from 'next/server';
import {
  getCampaignById,
  updateCampaign,
  deleteCampaign,
} from '@/lib/services/ad.service';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateId, parseBody, ValidationError } from '@/lib/validate';

// ---------------------------------------------------------------------------
// GET /api/ads/campaigns/[id] — Get campaign by ID
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }

    const { id } = await params;

    try {
      validateId(id);
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode });
      }
      throw err;
    }

    const campaign = await getCampaignById(id);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error('[GET /api/ads/campaigns/:id] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/ads/campaigns/[id] — Update campaign
// ---------------------------------------------------------------------------
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }

    const { id } = await params;

    try {
      validateId(id);
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode });
      }
      throw err;
    }

    const body = await parseBody(request);

    // Validate dates if provided
    if (body.startDate && body.endDate) {
      const startDate = new Date(body.startDate);
      const endDate = new Date(body.endDate);
      if (startDate >= endDate) {
        return NextResponse.json(
          { success: false, error: 'startDate must be before endDate' },
          { status: 400 },
        );
      }
    }

    // Validate budget if provided
    if (body.totalBudget !== undefined && (typeof body.totalBudget !== 'number' || body.totalBudget <= 0)) {
      return NextResponse.json(
        { success: false, error: 'totalBudget must be a positive number' },
        { status: 400 },
      );
    }

    const campaign = await updateCampaign(id, body);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: campaign,
      message: 'Campaign updated successfully',
    });
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error('[PUT /api/ads/campaigns/:id] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/ads/campaigns/[id] — Delete campaign (hard delete)
// ---------------------------------------------------------------------------
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }

    const { id } = await params;

    try {
      validateId(id);
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode });
      }
      throw err;
    }

    const result = await deleteCampaign(id);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Campaign deleted successfully',
    });
  } catch (error: unknown) {
    console.error('[DELETE /api/ads/campaigns/:id] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
