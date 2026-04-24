import { NextRequest, NextResponse } from 'next/server';
import { removeFromWishlist } from '@/lib/services/merchant.service';
import { requireAuth } from '@/lib/auth';

// ---------------------------------------------------------------------------
// DELETE /api/wishlist/[productId]?customerPhone=xxx
// ---------------------------------------------------------------------------
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const { productId } = await params;

    if (!productId || typeof productId !== 'string' || productId.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
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
