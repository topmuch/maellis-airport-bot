import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { handleInvoicePaymentWebhook } from '@/lib/services/billing.service'
import { verifyCinetPaySignature } from '@/lib/webhook-verify'

// ─────────────────────────────────────────────
// Input validation schema
// ─────────────────────────────────────────────

const cinetPayInvoiceWebhookSchema = z.object({
  cpm_trans_id: z.string().min(1),
  cpm_amount: z.string().optional(),
  cpm_currency: z.string().optional(),
  cpm_trans_status: z.string().min(1),
  cpm_custom: z.string().min(1),
  cpm_phone_prefixe: z.string().optional(),
  cpm_phone_num: z.string().optional(),
  cpm_pay_id: z.string().optional(),
  cpm_payment_date: z.string().optional(),
  cpm_payment_time: z.string().optional(),
  cpm_error_message: z.string().optional(),
})

// POST /api/webhooks/cinetpay-invoice — CinetPay webhook for invoice payments
// Always returns 200 (webhook providers expect this)
export async function POST(request: NextRequest) {
  try {
    // ── Read raw body for signature verification ──
    const rawBody = await request.text()

    let jsonBody: Record<string, unknown>
    try {
      jsonBody = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({
        success: true,
        message: 'Invalid JSON body',
      })
    }

    // ── Verify webhook signature ──
    const sigResult = await verifyCinetPaySignature(request, rawBody, jsonBody)
    if (!sigResult.valid) {
      console.warn(
        `[POST /api/webhooks/cinetpay-invoice] ⛔ REJECTED: ${sigResult.reason}`
      )
      return NextResponse.json({
        success: false,
        message: 'Invalid signature',
      })
    }

    // ── Validate request body with Zod ──
    const parsed = cinetPayInvoiceWebhookSchema.safeParse(jsonBody)
    if (!parsed.success) {
      console.warn(
        '[POST /api/webhooks/cinetpay-invoice] Invalid webhook payload:',
        parsed.error.issues.map((i) => i.path.join('.')).join(', ')
      )
      return NextResponse.json({
        success: true,
        message: 'Invalid payload structure',
      })
    }

    const body = parsed.data

    // Log incoming webhook (sanitized — no sensitive data)
    console.log(
      `[POST /api/webhooks/cinetpay-invoice] Verified webhook: ` +
      `trans=${body.cpm_trans_id}, status=${body.cpm_trans_status}`
    )

    // Process the CinetPay invoice payment webhook
    const result = await handleInvoicePaymentWebhook(body)

    console.log(
      `[POST /api/webhooks/cinetpay-invoice] Webhook processed: success=${result.success}, ` +
      `invoice=${result.invoiceNumber || 'N/A'}, status=${result.status || 'N/A'}`
    )

    // Always return 200 for webhooks
    // Do NOT expose internal result data to caller
    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
    })
  } catch (error) {
    // Even on error, return 200 to prevent webhook retries flooding
    // Never expose error details to caller
    console.error('[POST /api/webhooks/cinetpay-invoice] Error:', error)

    return NextResponse.json({
      success: true,
      message: 'Webhook received but processing failed',
    })
  }
}
