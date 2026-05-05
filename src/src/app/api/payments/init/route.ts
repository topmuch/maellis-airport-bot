import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { generatePayment, type PaymentProviderParams } from '@/lib/services/payment.providers'

// ── POST /api/payments/init ─────────────────────────────────────
// Initiate a payment with Orange Money or Wave.
// Routes to the correct provider via the Strategy pattern in payment.providers.ts
//
// Body:
//   provider: 'orange_money' | 'wave'
//   orderNumber: string (booking ID or order number)
//   amount: number
//   customerName: string
//   customerPhone: string
//   customerEmail?: string
//   description?: string
//   currency?: string (default 'XOF')
//   bookingType?: string (default 'order')

const SUPPORTED_PROVIDERS = ['orange_money', 'wave'] as const

const initPaymentSchema = {
  provider: (v: unknown) => typeof v === 'string' && (SUPPORTED_PROVIDERS as readonly string[]).includes(v),
  orderNumber: (v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= 200,
  amount: (v: unknown) => typeof v === 'number' && v > 0,
  customerName: (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 500,
  customerPhone: (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 20,
}

export async function POST(request: NextRequest) {
  try {
    const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT')
    const authResult = await checkRole(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication required' },
        { status: authResult.status || 401 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!initPaymentSchema.provider(body.provider)) {
      return NextResponse.json(
        { success: false, error: `provider is required and must be one of: ${SUPPORTED_PROVIDERS.join(', ')}` },
        { status: 400 }
      )
    }
    if (!initPaymentSchema.orderNumber(body.orderNumber)) {
      return NextResponse.json({ success: false, error: 'orderNumber is required (string, 1-200 chars)' }, { status: 400 })
    }
    if (!initPaymentSchema.amount(body.amount)) {
      return NextResponse.json({ success: false, error: 'amount is required and must be a positive number' }, { status: 400 })
    }
    if (!initPaymentSchema.customerName(body.customerName)) {
      return NextResponse.json({ success: false, error: 'customerName is required' }, { status: 400 })
    }
    if (!initPaymentSchema.customerPhone(body.customerPhone)) {
      return NextResponse.json({ success: false, error: 'customerPhone is required' }, { status: 400 })
    }

    const params: PaymentProviderParams = {
      orderNumber: body.orderNumber.trim(),
      amount: body.amount,
      customerName: body.customerName.trim(),
      customerPhone: body.customerPhone.trim(),
      customerEmail: typeof body.customerEmail === 'string' ? body.customerEmail.trim() : undefined,
      description: typeof body.description === 'string' ? body.description.trim() : '',
      currency: typeof body.currency === 'string' ? body.currency.trim() : 'XOF',
      bookingType: typeof body.bookingType === 'string' ? body.bookingType.trim() : 'order',
    }

    console.log('[payments/init] Initiating payment', {
      provider: body.provider,
      orderNumber: params.orderNumber,
      amount: params.amount,
      currency: params.currency,
    })

    const result = await generatePayment(body.provider, params)

    if (!result.success) {
      console.error('[payments/init] Payment initiation failed:', result.error)
      return NextResponse.json(
        { success: false, error: result.error || 'Payment initiation failed' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentUrl: result.paymentUrl,
        paymentToken: result.paymentToken,
        externalRef: result.externalRef,
        provider: body.provider,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment initiation failed'
    console.error('[payments/init] Error:', error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
