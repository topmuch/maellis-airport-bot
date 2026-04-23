import { NextRequest, NextResponse } from 'next/server';
import {
  getMerchantById,
  updateMerchant,
  deleteMerchant,
} from '@/lib/services/merchant.service';

// ---------------------------------------------------------------------------
// GET /api/merchants/[id] — Get merchant by ID
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Merchant ID is required' },
        { status: 400 },
      );
    }

    const merchant = await getMerchantById(id);

    if (!merchant) {
      return NextResponse.json(
        { success: false, error: 'Merchant not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: merchant });
  } catch (error) {
    console.error(`[GET /api/merchants/:id] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/merchants/[id] — Update merchant
// ---------------------------------------------------------------------------
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Merchant ID is required' },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate commission rate if provided
    if (body.commissionRate !== undefined && (typeof body.commissionRate !== 'number' || body.commissionRate < 0 || body.commissionRate > 1)) {
      return NextResponse.json(
        { success: false, error: 'commissionRate must be a number between 0 and 1' },
        { status: 400 },
      );
    }

    // Validate email format if provided
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 },
      );
    }

    // Validate at least one field is being updated
    const updatableFields = [
      'name', 'description', 'logo', 'category', 'terminal', 'gate',
      'location', 'phone', 'email', 'openingHours', 'isActive', 'isVerified',
      'commissionRate', 'paymentSchedule',
    ];
    const hasUpdate = updatableFields.some((field) => body[field] !== undefined);

    if (!hasUpdate) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 },
      );
    }

    const merchant = await updateMerchant(id, body);

    if (!merchant) {
      return NextResponse.json(
        { success: false, error: 'Merchant not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: merchant,
      message: 'Merchant updated successfully',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid category')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 },
        );
      }
    }

    console.error(`[PUT /api/merchants/:id] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/merchants/[id] — Soft delete merchant
// ---------------------------------------------------------------------------
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Merchant ID is required' },
        { status: 400 },
      );
    }

    const result = await deleteMerchant(id);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Merchant not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Merchant deactivated successfully',
    });
  } catch (error: unknown) {
    console.error(`[DELETE /api/merchants/:id] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}


