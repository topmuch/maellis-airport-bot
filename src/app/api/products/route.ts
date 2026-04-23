import { NextRequest, NextResponse } from 'next/server';
import { getProducts, searchProducts, createProduct } from '@/lib/services/merchant.service';

// ---------------------------------------------------------------------------
// GET /api/products?merchantId=xxx&category=xxx&search=xxx&available=true
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId') || undefined;
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const tags = searchParams.get('tags') || undefined;

    // available=true (default) → only available; available=false → all
    const availableParam = searchParams.get('available');
    const isAvailable = availableParam === 'true' ? true : availableParam === 'false' ? false : undefined;

    let products;

    if (search) {
      // Use full text search when search query is provided
      const filters: Parameters<typeof searchProducts>[1] = {};
      if (merchantId) filters.merchantId = merchantId;
      if (category) filters.category = category;
      if (isAvailable !== undefined) filters.isAvailable = isAvailable;
      products = await searchProducts(search, filters);
    } else {
      products = await getProducts(merchantId, category, undefined, isAvailable, tags);
    }

    return NextResponse.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    console.error('[GET /api/products] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/products — Create product (merchantId in body)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const requiredFields: string[] = ['merchantId', 'name', 'category', 'price'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 },
      );
    }

    let images = body.images;
    if (images && typeof images === 'object') images = JSON.stringify(images);
    let tags = body.tags;
    if (tags && typeof tags === 'object') tags = JSON.stringify(tags);

    const product = await createProduct(body.merchantId, {
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
    if (error instanceof Error && error.message === 'Merchant not found') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 },
      );
    }
    console.error('[POST /api/products] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
