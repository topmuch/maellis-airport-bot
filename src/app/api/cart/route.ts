import { NextRequest, NextResponse } from 'next/server';
import { getCart, addToCart } from '@/lib/services/cart.service';

// ---------------------------------------------------------------------------
// GET /api/cart?phone=xxx — Retrieve cart with computed totals
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required (query param: phone)' },
        { status: 400 },
      );
    }

    const cartData = await getCart(phone);

    if (!cartData) {
      return NextResponse.json(
        { success: false, error: 'Cart not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: cartData,
    });
  } catch (error) {
    console.error('[GET /api/cart] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/cart — Add item to cart
// Body: { phone, productId, quantity }
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields: string[] = ['phone', 'productId', 'quantity'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate quantity
    if (!Number.isInteger(body.quantity) || body.quantity < 1) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be a positive integer' },
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

    // Validate productId format (UUID-like)
    if (typeof body.productId !== 'string' || body.productId.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Invalid productId format' },
        { status: 400 },
      );
    }

    const cartData = await addToCart(body.phone, {
      productId: body.productId,
      quantity: body.quantity,
    });

    return NextResponse.json({
      success: true,
      data: cartData,
      message: 'Item added to cart',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      const message = error.message;

      if (message.includes('Product not found')) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 404 },
        );
      }

      if (
        message.includes('not available') ||
        message.includes('not active')
      ) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 400 },
        );
      }

      if (message.includes('Insufficient stock')) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 409 },
        );
      }
    }

    console.error('[POST /api/cart] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
