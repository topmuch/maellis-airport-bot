import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createOrder, getOrders } from '@/lib/services/merchant.service';

// ---------------------------------------------------------------------------
// POST /api/orders — Create order (no auth for bot)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields: string[] = ['merchantId', 'customerName', 'customerPhone', 'items'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate items is non-empty array
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'items must be a non-empty array' },
        { status: 400 },
      );
    }

    // Validate each item
    for (const item of body.items) {
      if (!item.productId || !item.productName || !item.quantity || item.quantity < 1) {
        return NextResponse.json(
          { success: false, error: 'Each item must have productId, productName, and quantity >= 1' },
          { status: 400 },
        );
      }
    }

    // Validate order type if provided
    const validTypes = ['pickup', 'delivery_gate', 'reservation'];
    if (body.type && !validTypes.includes(body.type)) {
      return NextResponse.json(
        { success: false, error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate phone format
    if (!/^\+?[\d\s-]{8,}$/.test(body.customerPhone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid customer phone format' },
        { status: 400 },
      );
    }

    // Validate email format if provided
    if (body.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.customerEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 },
      );
    }

    const order = await createOrder({
      merchantId: body.merchantId,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      flightNumber: body.flightNumber,
      gate: body.gate,
      type: body.type,
      items: body.items,
      scheduledTime: body.scheduledTime,
      notes: body.notes,
    });

    return NextResponse.json(
      { success: true, data: order, message: 'Order created successfully' },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      const message = error.message;
      if (
        message === 'Merchant not found' ||
        message === 'Product not found'
      ) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 404 },
        );
      }

      if (
        message === 'Merchant is not active' ||
        message === 'Product is not available' ||
        message === 'Order must have at least one item' ||
        message.includes('Invalid item')
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

    console.error('[POST /api/orders] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/orders?merchantId=xxx&status=xxx&customerPhone=xxx (auth required)
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: authResult.status || 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId') || undefined;
    const status = searchParams.get('status') || undefined;
    const customerPhone = searchParams.get('customerPhone') || undefined;

    const orders = await getOrders(merchantId, status, customerPhone);

    return NextResponse.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error('[GET /api/orders] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
