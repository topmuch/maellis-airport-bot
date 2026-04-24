import { NextRequest, NextResponse } from 'next/server'
import { handleInvoicePaymentWebhook } from '@/lib/services/billing.service'

// POST /api/webhooks/cinetpay-invoice — CinetPay webhook for invoice payments
// Always returns 200 (webhook providers expect this)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log(
      '[POST /api/webhooks/cinetpay-invoice] Received webhook:',
      JSON.stringify(body).slice(0, 500)
    )

    // Process the CinetPay invoice payment webhook
    const result = await handleInvoicePaymentWebhook(body)

    console.log(
      `[POST /api/webhooks/cinetpay-invoice] Webhook processed: success=${result.success}, ` +
      `invoice=${result.invoiceNumber || 'N/A'}, status=${result.status || 'N/A'}`
    )

    // Always return 200 for webhooks
    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
      data: result,
    })
  } catch (error) {
    // Even on error, return 200 to prevent webhook retries flooding
    console.error('[POST /api/webhooks/cinetpay-invoice] Error:', error)

    return NextResponse.json({
      success: true,
      message: 'Webhook received but processing failed',
    })
  }
}
