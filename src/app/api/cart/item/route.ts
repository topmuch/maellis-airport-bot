import { NextRequest, NextResponse } from 'next/server';
import { updateCartItem, removeFromCart } from '@/lib/services/cart.service';

// ---------------------------------------------------------------------------
// PUT /api/cart/item — Update cart item quantity
// Body: { phone, cartItemId, quantity }
// ---------------------------------------------------------------------------
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields: string[] = ['phone', 'cartItemId', 'quantity'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate quantity is an integer (0 is allowed — will remove item)
    if (!Number.isInteger(body.quantity) || body.quantity < 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be a non-negative integer (0 to remove)' },
        { status: 400 },
      );
    }

    // Validate phone format
    if (!/^\+?[\d\s-]{8,}$/.test(body.phone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone format' },
        { status: 400 },
      );
    }

    // Validate cartItemId
    if (typeof body.cartItemId !== 'string' || body.cartItemId.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Invalid cartItemId format' },
        { status: 400 },
      );
    }

    const cartData = await updateCartItem(body.phone, body.cartItemId, body.quantity);

    return NextResponse.json({
      success: true,
      data: cartData,
      message: body.quantity === 0
        ? 'Item removed from cart'
        : 'Cart item updated',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      const message = error.message;

      if (
        message.includes('Cart not found') ||
        message.includes('Cart item not found')
      ) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 404 },
        );
      }

      if (message.includes('Insufficient stock')) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 409 },
        );
      }
    }

    console.error('[PUT /api/cart/item] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/cart/item — Remove item from cart
// Body: { phone, cartItemId }
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields: string[] = ['phone', 'cartItemId'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate phone format
    if (!/^\+?[\d\s-]{8,}$/.test(body.phone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone format' },
        { status: 400 },
      );
    }

    // Validate cartItemId
    if (typeof body.cartItemId !== 'string' || body.cartItemId.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Invalid cartItemId format' },
        { status: 400 },
      );
    }

    const cartData = await removeFromCart(body.phone, body.cartItemId);

    return NextResponse.json({
      success: true,
      data: cartData,
      message: 'Item removed from cart',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      const message = error.message;

      if (
        message.includes('Cart not found') ||
        message.includes('Cart item not found')
      ) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 404 },
        );
      }
    }

    console.error('[DELETE /api/cart/item] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
