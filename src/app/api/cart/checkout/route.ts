import { NextRequest, NextResponse } from 'next/server';
import { checkoutCart } from '@/lib/services/cart.service';
import { requireAuth } from '@/lib/auth';
import { parseBody, ValidationError } from '@/lib/validate';

// ---------------------------------------------------------------------------
// POST /api/cart/checkout — Checkout cart and create orders per merchant
// Body: { phone, type, customerName, customerEmail?, flightNumber?, gate?,
//         scheduledTime?, notes?, paymentMethod }
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }

    const body = await parseBody(request);

    // Validate required fields
    const requiredFields: string[] = ['phone', 'type', 'customerName', 'paymentMethod'];
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

    // Validate order type
    const validTypes = ['pickup', 'delivery_gate'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { success: false, error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate customerName
    if (!body.customerName || body.customerName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'customerName must be at least 2 characters' },
        { status: 400 },
      );
    }

    // Validate paymentMethod
    const validPaymentMethods = ['cinetpay', 'cash', 'mobile_money'];
    if (!validPaymentMethods.includes(body.paymentMethod)) {
      return NextResponse.json(
        { success: false, error: `paymentMethod must be one of: ${validPaymentMethods.join(', ')}` },
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

    // Validate scheduledTime format if provided
    if (body.scheduledTime && isNaN(Date.parse(body.scheduledTime))) {
      return NextResponse.json(
        { success: false, error: 'Invalid scheduledTime format (must be a valid date/time)' },
        { status: 400 },
      );
    }

    // If delivery_gate, gate is required
    if (body.type === 'delivery_gate' && !body.gate) {
      return NextResponse.json(
        { success: false, error: 'gate is required for delivery_gate orders' },
        { status: 400 },
      );
    }

    const result = await checkoutCart(body.phone, {
      type: body.type,
      customerName: body.customerName.trim(),
      customerEmail: body.customerEmail,
      flightNumber: body.flightNumber,
      gate: body.gate,
      scheduledTime: body.scheduledTime,
      notes: body.notes,
      paymentMethod: body.paymentMethod,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Checkout successful — ${result.ordersCount} order(s) created`,
    });
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    if (error instanceof Error) {
      const message = error.message;

      if (
        message === 'Cart not found'
      ) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 404 },
        );
      }

      if (
        message === 'Cart is empty' ||
        message.includes('not available') ||
        message.includes('no longer exists') ||
        message.includes('no longer active')
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

    console.error('[POST /api/cart/checkout] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
