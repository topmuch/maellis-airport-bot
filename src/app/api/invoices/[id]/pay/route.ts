import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { recordPayment } from '@/lib/services/billing.service'

// POST /api/invoices/:id/pay — Record manual payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { amount, method, transactionId, metadata } = body

    // Validation
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'amount is required and must be a positive number' },
        { status: 400 }
      )
    }

    if (!method || typeof method !== 'string') {
      return NextResponse.json(
        { success: false, error: 'method is required (e.g. cinetpay, bank_transfer, cash)' },
        { status: 400 }
      )
    }

    const payment = await recordPayment(id, {
      amount,
      method,
      transactionId: transactionId || undefined,
      metadata: metadata || undefined,
    })

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: payment,
      message: 'Payment recorded successfully',
    })
  } catch (error: unknown) {
    console.error('Error recording payment:', error)

    const message = error instanceof Error ? error.message : 'Failed to record payment'

    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 })
    }

    if (message.includes('exceeds') || message.includes('Invalid') || message.includes('overpaid') || message.includes('already') || message.includes('Cannot')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to record payment' },
      { status: 500 }
    )
  }
}
