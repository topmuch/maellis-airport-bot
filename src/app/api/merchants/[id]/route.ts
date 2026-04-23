import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getMerchantById,
  updateMerchant,
  deleteMerchant,
  createProduct,
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
// PUT /api/merchants/[id] — Update merchant (auth required)
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
      'location', 'phone', 'email', 'openingHours', 'isActive',
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
      if (error.message === 'Unauthorized' || error.message === 'Authentication required') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 },
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
// DELETE /api/merchants/[id] — Soft delete merchant (auth required)
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
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Authentication required') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 },
        );
      }
    }

    console.error(`[DELETE /api/merchants/:id] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/merchants/[id]/products — Create product for merchant (auth required)
// ---------------------------------------------------------------------------
export async function POST(
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

    const { id: merchantId } = await params;

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'Merchant ID is required' },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields: string[] = ['name', 'category', 'price'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate price
    if (typeof body.price !== 'number' || body.price < 0) {
      return NextResponse.json(
        { success: false, error: 'price must be a non-negative number' },
        { status: 400 },
      );
    }

    // Validate stock if provided
    if (body.stock !== undefined && (typeof body.stock !== 'number' || body.stock < 0 || !Number.isInteger(body.stock))) {
      return NextResponse.json(
        { success: false, error: 'stock must be a non-negative integer' },
        { status: 400 },
      );
    }

    // Validate discount if provided
    if (body.discountPercent !== undefined && (typeof body.discountPercent !== 'number' || body.discountPercent < 0 || body.discountPercent > 100)) {
      return NextResponse.json(
        { success: false, error: 'discountPercent must be between 0 and 100' },
        { status: 400 },
      );
    }

    // Normalize images/tags if arrays
    let images = body.images;
    if (images && typeof images === 'object') {
      images = JSON.stringify(images);
    }
    let tags = body.tags;
    if (tags && typeof tags === 'object') {
      tags = JSON.stringify(tags);
    }

    const product = await createProduct(merchantId, {
      name: body.name,
      description: body.description,
      category: body.category,
      price: body.price,
      currency: body.currency,
      images,
      stock: body.stock,
      isAvailable: body.isAvailable,
      isPreOrder: body.isPreOrder,
      tags,
      discountPercent: body.discountPercent,
    });

    return NextResponse.json(
      { success: true, data: product, message: 'Product created successfully' },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Merchant not found') {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 },
        );
      }
      if (error.message === 'Unauthorized' || error.message === 'Authentication required') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 },
        );
      }
    }

    console.error(`[POST /api/merchants/:id/products] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
