import { NextRequest, NextResponse } from 'next/server';
import { createProduct } from '@/lib/services/merchant.service';
import { requireAuth, requireRole } from '@/lib/auth';

// GET /api/merchants/[id]/products — Get products for merchant
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    return NextResponse.json({ success: true, data: [], count: 0 });
  } catch (error) {
    console.error('[GET /api/merchants/:id/products] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/merchants/[id]/products — Create product for merchant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const { id: merchantId } = await params;

    if (!merchantId || typeof merchantId !== 'string' || merchantId.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 },
      );
    }

    const body = await request.json();

    const requiredFields: string[] = ['name', 'category', 'price'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 },
      );
    }

    if (typeof body.price !== 'number' || body.price < 0) {
      return NextResponse.json(
        { success: false, error: 'price must be a non-negative number' },
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
    }

    console.error(`[POST /api/merchants/:id/products] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
