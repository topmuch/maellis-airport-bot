import { NextRequest, NextResponse } from 'next/server';
import { removeFromWishlist } from '@/lib/services/merchant.service';

// ---------------------------------------------------------------------------
// DELETE /api/wishlist/[productId]?customerPhone=xxx
// ---------------------------------------------------------------------------
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const { productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const customerPhone = searchParams.get('customerPhone');

    if (!customerPhone) {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameter: customerPhone' },
        { status: 400 },
      );
    }

    const result = await removeFromWishlist(customerPhone, productId);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Item removed from wishlist',
    });
  } catch (error) {
    console.error(`[DELETE /api/wishlist/:productId] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
