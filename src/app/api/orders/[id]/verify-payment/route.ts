import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPaymentStatus } from '@/lib/services/payment.service';

// ---------------------------------------------------------------------------
// GET /api/orders/[id]/verify-payment — Verify payment status for an order
// 1. Find order, get transactionId
// 2. Call checkPaymentStatus(transactionId)
// 3. If paid, update order paymentStatus + status
// 4. Return current payment status
// ---------------------------------------------------------------------------
export async function GET(
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

    // 1. Find the order
    const order = await db.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 },
      );
    }

    // If already paid, return immediately
    if (order.paymentStatus === 'paid') {
      return NextResponse.json({
        success: true,
        data: {
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          orderStatus: order.status,
          transactionId: order.transactionId,
          verifiedAt: new Date().toISOString(),
          alreadyPaid: true,
        },
        message: 'Order is already paid',
      });
    }

    // 2. Check if order has a transactionId to verify
    if (!order.transactionId) {
      return NextResponse.json({
        success: true,
        data: {
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          orderStatus: order.status,
          transactionId: null,
          verifiedAt: new Date().toISOString(),
        },
        message: 'No transaction ID found — payment not initiated or pending payment link generation',
      });
    }

    // 3. Call CinetPay to check the payment status
    const paymentResult = await checkPaymentStatus(order.transactionId);

    // 4. If paid, update order records
    if (paymentResult.status === 'paid') {
      await db.order.update({
        where: { id },
        data: {
          paymentStatus: 'paid',
          status: order.status === 'pending' ? 'confirmed' : order.status,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          orderNumber: order.orderNumber,
          paymentStatus: 'paid',
          orderStatus: order.status === 'pending' ? 'confirmed' : order.status,
          transactionId: order.transactionId,
          amount: paymentResult.amount,
          provider: paymentResult.provider,
          paidAt: paymentResult.timestamp,
          verifiedAt: new Date().toISOString(),
        },
        message: 'Payment verified and confirmed',
      });
    }

    // Payment not yet completed
    return NextResponse.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        paymentStatus: paymentResult.status,
        orderStatus: order.status,
        transactionId: order.transactionId,
        amount: paymentResult.amount,
        provider: paymentResult.provider,
        verifiedAt: new Date().toISOString(),
      },
      message: `Payment status: ${paymentResult.status}`,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      const message = error.message;

      if (
        message.includes('CINETPAY_API_KEY') ||
        message.includes('CINETPAY_SITE_ID') ||
        message.includes('must be configured')
      ) {
        return NextResponse.json(
          { success: false, error: 'Payment verification is not configured. Contact support.' },
          { status: 503 },
        );
      }

      if (message.includes('CinetPay check API returned HTTP')) {
        return NextResponse.json(
          { success: false, error: 'Payment provider error. Please try again later.' },
          { status: 502 },
        );
      }
    }

    console.error('[GET /api/orders/:id/verify-payment] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
