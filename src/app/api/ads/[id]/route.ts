import { NextRequest, NextResponse } from 'next/server';
import {
  getAdById,
  updateAd,
  deleteAd,
  VALID_AD_TYPES,
  VALID_PLACEMENTS,
  VALID_BUDGET_TYPES,
} from '@/lib/services/ad.service';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateId, parseBody, ValidationError } from '@/lib/validate';

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
    if (body.budget !== undefined && (!Number.isFinite(body.budget) || body.budget <= 0)) {
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
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
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
    console.error('[DELETE /api/ads/:id] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
