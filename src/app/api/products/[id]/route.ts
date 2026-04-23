import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getProductById, updateProduct, deleteProduct } from '@/lib/services/merchant.service';

// ---------------------------------------------------------------------------
// GET /api/products/[id] — Get product by ID
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 },
      );
    }

    const product = await getProductById(id);

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error(`[GET /api/products/:id] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/products/[id] — Update product (auth required)
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
        { success: false, error: 'Product ID is required' },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate price if provided
    if (body.price !== undefined && (typeof body.price !== 'number' || body.price < 0)) {
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
    if (body.images !== undefined && typeof body.images === 'object') {
      body.images = JSON.stringify(body.images);
    }
    if (body.tags !== undefined && typeof body.tags === 'object') {
      body.tags = JSON.stringify(body.tags);
    }

    // Validate at least one field is being updated
    const updatableFields = [
      'name', 'description', 'category', 'price', 'currency', 'images',
      'stock', 'isAvailable', 'isPreOrder', 'tags', 'discountPercent',
    ];
    const hasUpdate = updatableFields.some((field) => body[field] !== undefined);

    if (!hasUpdate) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 },
      );
    }

    const product = await updateProduct(id, body);

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
      message: 'Product updated successfully',
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

    console.error(`[PUT /api/products/:id] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/products/[id] — Delete product (auth required)
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
        { success: false, error: 'Product ID is required' },
        { status: 400 },
      );
    }

    const result = await deleteProduct(id);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Product deleted successfully',
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

    console.error(`[DELETE /api/products/:id] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
