import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getAdById,
  updateAd,
  deleteAd,
  VALID_AD_TYPES,
  VALID_PLACEMENTS,
  VALID_BUDGET_TYPES,
} from '@/lib/services/ad.service';

// ---------------------------------------------------------------------------
// GET /api/ads/[id] — Get ad by ID
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status },
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Ad ID is required' },
        { status: 400 },
      );
    }

    const ad = await getAdById(id);

    if (!ad) {
      return NextResponse.json(
        { success: false, error: 'Advertisement not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: ad });
  } catch (error) {
    console.error('[GET /api/ads/:id] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/ads/[id] — Update ad
// ---------------------------------------------------------------------------
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: authResult.status || 401 },
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Ad ID is required' },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate type if provided
    if (body.type && !VALID_AD_TYPES.includes(body.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Must be one of: ${VALID_AD_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate placement if provided
    if (body.placement && !VALID_PLACEMENTS.includes(body.placement)) {
      return NextResponse.json(
        { success: false, error: `Invalid placement. Must be one of: ${VALID_PLACEMENTS.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate dates if both provided
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
    if (body.budget !== undefined && (typeof body.budget !== 'number' || body.budget <= 0)) {
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

    // Validate targetAudience is valid JSON if provided
    if (body.targetAudience && typeof body.targetAudience !== 'string') {
      body.targetAudience = JSON.stringify(body.targetAudience);
    }

    const ad = await updateAd(id, body);

    if (!ad) {
      return NextResponse.json(
        { success: false, error: 'Advertisement not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: ad,
      message: 'Advertisement updated successfully',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Authentication required') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }
    console.error('[PUT /api/ads/:id] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/ads/[id] — Delete ad
// ---------------------------------------------------------------------------
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: authResult.status || 401 },
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Ad ID is required' },
        { status: 400 },
      );
    }

    const result = await deleteAd(id);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Advertisement not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Advertisement deleted successfully',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Authentication required') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }
    console.error('[DELETE /api/ads/:id] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
