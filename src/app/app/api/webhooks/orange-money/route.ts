import { NextRequest, NextResponse } from 'next/server'
import { handleOrangeMoneyWebhook } from '@/lib/services/payment.providers'

// POST /api/webhooks/orange-money — Orange Money payment callback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
    }

    const result = await handleOrangeMoneyWebhook(body as Record<string, unknown>)

    return NextResponse.json({
      success: result.success,
      message: result.message,
      orderNumber: result.orderNumber,
      status: result.status,
    })
  } catch (error) {
    console.error('[webhook:orange-money] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
