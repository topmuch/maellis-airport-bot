import { NextRequest, NextResponse } from 'next/server';
import { getProducts, searchProducts } from '@/lib/services/merchant.service';

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
