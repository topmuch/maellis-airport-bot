import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import {
  getLoungeById,
  updateLounge,
  deleteLounge,
} from '@/lib/services/lounge.service';
import { parseBody, ValidationError } from '@/lib/validate';

// ---------------------------------------------------------------------------
// GET /api/lounges/[id] — Get a single lounge by ID
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

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 },
      );
    }

    const lounge = await getLoungeById(id);

    if (!lounge) {
      return NextResponse.json(
        { success: false, error: 'Lounge not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: lounge,
    });
  } catch (error) {
    console.error(`[GET /api/lounges/:id] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/lounges/[id] — Update a lounge (admin only)
// ---------------------------------------------------------------------------
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authenticate and authorize
    const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error || 'Unauthorized' }, { status: authResult.status || 401 });
    }

    const { id } = await params;

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 },
      );
    }

    const body = await parseBody(request);

    // Validate numeric fields when provided
    const priceFields = ['priceStandard', 'priceBusiness', 'priceFirstClass', 'priceChild'];
    for (const field of priceFields) {
      if (body[field] !== undefined && (!Number.isFinite(body[field]) || body[field] < 0)) {
        return NextResponse.json(
          { success: false, error: `${field} must be a non-negative number` },
          { status: 400 },
        );
      }
    }

    if (body.maxCapacity !== undefined && (typeof body.maxCapacity !== 'number' || body.maxCapacity < 1 || !Number.isInteger(body.maxCapacity))) {
      return NextResponse.json(
        { success: false, error: 'maxCapacity must be a positive integer' },
        { status: 400 },
      );
    }

    if (body.currentOccupancy !== undefined && (typeof body.currentOccupancy !== 'number' || body.currentOccupancy < 0 || !Number.isInteger(body.currentOccupancy))) {
      return NextResponse.json(
        { success: false, error: 'currentOccupancy must be a non-negative integer' },
        { status: 400 },
      );
    }

    if (body.isOpen !== undefined && typeof body.isOpen !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isOpen must be a boolean' },
        { status: 400 },
      );
    }

    // Validate time format if provided
    if (body.openingTime && !/^\d{2}:\d{2}$/.test(body.openingTime)) {
      return NextResponse.json(
        { success: false, error: 'openingTime must be in HH:mm format' },
        { status: 400 },
      );
    }
    if (body.closingTime && !/^\d{2}:\d{2}$/.test(body.closingTime)) {
      return NextResponse.json(
        { success: false, error: 'closingTime must be in HH:mm format' },
        { status: 400 },
      );
    }

    // Ensure at least one field is being updated
    const updatableFields = [
      'name', 'description', 'terminal', 'gateLocation', 'location', 'imageUrl',
      'priceStandard', 'priceBusiness', 'priceFirstClass', 'priceChild',
      'maxCapacity', 'currentOccupancy', 'isOpen',
      'openingTime', 'closingTime', 'openingHours', 'amenities', 'accessLevel',
    ];
    const hasUpdate = updatableFields.some((field) => body[field] !== undefined);

    if (!hasUpdate) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 },
      );
    }

    // Normalize amenities if it's an object
    if (body.amenities !== undefined && typeof body.amenities === 'object') {
      body.amenities = JSON.stringify(body.amenities);
    }

    const lounge = await updateLounge(id, body);

    if (!lounge) {
      return NextResponse.json(
        { success: false, error: 'Lounge not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: lounge,
      message: 'Lounge updated successfully',
    });
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Authentication required') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 },
        );
      }
      if (error.message === 'Forbidden' || error.message.includes('Insufficient permissions')) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 },
        );
      }
    }

    console.error(`[PUT /api/lounges/:id] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/lounges/[id] — Soft-delete a lounge (set isOpen=false, admin only)
// ---------------------------------------------------------------------------
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authenticate and authorize
    const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error || 'Unauthorized' }, { status: authResult.status || 401 });
    }

    const { id } = await params;

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 },
      );
    }

    const result = await deleteLounge(id);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Lounge not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Lounge deactivated successfully',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Authentication required') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 },
        );
      }
      if (error.message === 'Forbidden' || error.message.includes('Insufficient permissions')) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 },
        );
      }
    }

    console.error(`[DELETE /api/lounges/:id] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
