import { NextRequest, NextResponse } from 'next/server';
import { handleCinetPayWebhook } from '@/lib/services/payment.service';
import { createPayoutForOrder } from '@/lib/services/payout.service';
import { db } from '@/lib/db';

// ---------------------------------------------------------------------------
// POST /api/webhooks/payment — CinetPay webhook notification
// Always returns 200 (webhook providers expect this).
// Processes the webhook and triggers background payout creation.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log incoming webhook for debugging
    console.log('[POST /api/webhooks/payment] Received webhook:', JSON.stringify(body).slice(0, 500));

    // 1. Process the CinetPay webhook
    const result = await handleCinetPayWebhook(body);

    console.log(
      `[POST /api/webhooks/payment] Webhook processed: success=${result.success}, ` +
      `order=${result.orderNumber}, status=${result.status}`,
    );

    // 2. If payment was successful, trigger payout creation in background
    if (result.success && result.status === 'paid' && result.orderNumber) {
      // Find the order by orderNumber to get its ID
      const order = await db.order.findUnique({
        where: { orderNumber: result.orderNumber },
        select: { id: true, orderNumber: true, status: true },
      });

      if (order && order.status === 'confirmed') {
        // Fire-and-forget: trigger payout creation without awaiting
        createPayoutForOrder(order.id).catch((payoutError) => {
          console.error(
            `[POST /api/webhooks/payment] Background payout creation failed for order ${order.orderNumber}:`,
            payoutError,
          );
        });

        console.log(
          `[POST /api/webhooks/payment] Triggered payout creation for order ${order.orderNumber}`,
        );
      }
    }

    // 3. Always return 200 for webhooks (CinetPay expects this)
    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
      data: result,
    });
  } catch (error) {
    // Even on error, return 200 to prevent webhook retries flooding
    console.error('[POST /api/webhooks/payment] Error:', error);

    return NextResponse.json({
      success: true,
      message: 'Webhook received but processing failed',
    });
  }
}
