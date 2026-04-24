import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleCinetPayWebhook } from '@/lib/services/payment.service';
import { createPayoutForOrder } from '@/lib/services/payout.service';
import { db } from '@/lib/db';
import { verifyCinetPaySignature } from '@/lib/webhook-verify';

// ─────────────────────────────────────────────
// Input validation schema
// ─────────────────────────────────────────────

const cinetPayWebhookSchema = z.object({
  cpm_trans_id: z.string().min(1),
  cpm_amount: z.string().min(1),
  cpm_currency: z.string().min(1),
  cpm_trans_status: z.string().min(1),
  cpm_custom: z.string().optional(),
  cpm_phone_prefixe: z.string().min(1),
  cpm_phone_num: z.string().min(1),
  cpm_pay_id: z.string().min(1),
  cpm_payment_date: z.string().min(1),
  cpm_payment_time: z.string().min(1),
  cpm_error_message: z.string().optional(),
});

// ---------------------------------------------------------------------------
// POST /api/webhooks/payment — CinetPay webhook notification
// Always returns 200 (webhook providers expect this).
// Processes the webhook and triggers background payout creation.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    // ── Read raw body for signature verification ──
    const rawBody = await request.text();

    let jsonBody: Record<string, unknown>;
    try {
      jsonBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({
        success: true,
        message: 'Invalid JSON body',
      });
    }

    // ── Verify webhook signature ──
    const sigResult = await verifyCinetPaySignature(request, rawBody, jsonBody);
    if (!sigResult.valid) {
      console.warn(
        `[POST /api/webhooks/payment] ⛔ REJECTED: ${sigResult.reason}`
      );
      // Still return 200 to avoid retry floods, but log the rejection
      return NextResponse.json({
        success: false,
        message: 'Invalid signature',
      });
    }

    // ── Validate request body with Zod ──
    const parsed = cinetPayWebhookSchema.safeParse(jsonBody);
    if (!parsed.success) {
      console.warn(
        '[POST /api/webhooks/payment] Invalid webhook payload:',
        parsed.error.issues.map((i) => i.path.join('.')).join(', ')
      );
      return NextResponse.json({
        success: true,
        message: 'Invalid payload structure',
      });
    }

    const body = parsed.data;

    // Log incoming webhook (sanitized — no sensitive fields)
    console.log(
      `[POST /api/webhooks/payment] Verified webhook: ` +
      `trans=${body.cpm_trans_id}, status=${body.cpm_trans_status}, ` +
      `amount=${body.cpm_amount}`
    );

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
            payoutError instanceof Error ? payoutError.message : String(payoutError),
          );
        });

        console.log(
          `[POST /api/webhooks/payment] Triggered payout creation for order ${order.orderNumber}`,
        );
      }
    }

    // 3. Always return 200 for webhooks (CinetPay expects this)
    // Do NOT expose internal `result.data` to caller
    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error) {
    // Even on error, return 200 to prevent webhook retries flooding
    // Never expose error details to caller
    console.error('[POST /api/webhooks/payment] Error:', error);

    return NextResponse.json({
      success: true,
      message: 'Webhook received but processing failed',
    });
  }
}
