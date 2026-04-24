import { NextRequest, NextResponse } from 'next/server';
import { clearCart } from '@/lib/services/cart.service';
import { requireAuth } from '@/lib/auth';

// ---------------------------------------------------------------------------
// DELETE /api/cart/clear?phone=xxx — Clear the entire cart
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required (query param: phone)' },
        { status: 400 },
      );
    }

    // Validate phone format
    if (!/^\+?[\d\s-]{8,}$/.test(phone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone format' },
        { status: 400 },
      );
    }

    await clearCart(phone);

    return NextResponse.json({
      success: true,
      message: 'Cart cleared successfully',
    });
  } catch (error) {
    console.error('[DELETE /api/cart/clear] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
