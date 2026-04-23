import { NextRequest, NextResponse } from 'next/server';
import { getWishlist, addToWishlist } from '@/lib/services/merchant.service';

// ---------------------------------------------------------------------------
// GET /api/wishlist?customerPhone=xxx
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerPhone = searchParams.get('customerPhone');

    if (!customerPhone) {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameter: customerPhone' },
        { status: 400 },
      );
    }

    const wishlist = await getWishlist(customerPhone);

    return NextResponse.json({
      success: true,
      data: wishlist,
      count: wishlist.length,
    });
  } catch (error) {
    console.error('[GET /api/wishlist] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/wishlist — Add to wishlist
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields: string[] = ['customerPhone', 'productId'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 },
      );
    }

    const wishlist = await addToWishlist(body.customerPhone, body.productId);

    return NextResponse.json(
      { success: true, data: wishlist, message: 'Item added to wishlist' },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Product not found') {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 },
        );
      }
    }

    console.error('[POST /api/wishlist] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
