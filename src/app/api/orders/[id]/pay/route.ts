import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getOrderPaymentLink } from '@/lib/services/payment.service';

// ---------------------------------------------------------------------------
// POST /api/orders/[id]/pay — Generate payment link for an order
// Body: { paymentMethod }
// Returns: { paymentUrl, paymentToken }
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate paymentMethod (optional, for future extension)
    if (body.paymentMethod && typeof body.paymentMethod !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid paymentMethod' },
        { status: 400 },
      );
    }

    // 1. Find the order
    const order = await db.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 },
      );
    }

    // 2. Check order can be paid (not cancelled, not already paid)
    if (order.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Cannot pay for a cancelled order' },
        { status: 400 },
      );
    }

    if (order.paymentStatus === 'paid') {
      return NextResponse.json(
        { success: false, error: 'Order has already been paid' },
        { status: 409 },
      );
    }

    // 3. Generate payment link using CinetPay
    const paymentResult = await getOrderPaymentLink(
      order.orderNumber,
      order.total,
      order.customerName,
      order.customerPhone,
      order.customerEmail ?? undefined,
    );

    // 4. Update order with payment method
    await db.order.update({
      where: { id },
      data: {
        paymentMethod: body.paymentMethod ?? 'cinetpay',
        paymentStatus: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentUrl: paymentResult.paymentUrl,
        paymentToken: paymentResult.paymentToken,
        orderNumber: order.orderNumber,
        amount: order.total,
        currency: order.currency,
      },
      message: 'Payment link generated',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      const message = error.message;

      if (message.includes('CinetPay API returned HTTP')) {
        return NextResponse.json(
          { success: false, error: 'Payment provider error. Please try again later.' },
          { status: 502 },
        );
      }
    }

    console.error('[POST /api/orders/:id/pay] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
