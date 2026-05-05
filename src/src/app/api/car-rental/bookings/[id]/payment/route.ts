import { NextRequest, NextResponse } from 'next/server'
import { processPayment } from '@/lib/services/car-rental.service'
import { parseBody, ValidationError } from '@/lib/validate'

// POST /api/car-rental/bookings/[id]/payment — Payment callback (placeholder)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    const body = await parseBody(request)

    if (!body.paymentRef) {
      return NextResponse.json(
        { success: false, error: 'paymentRef is required' },
        { status: 400 }
      )
    }

    const booking = await processPayment(id, {
      paymentRef: body.paymentRef,
      status: body.status || 'paid',
    })

    return NextResponse.json({ success: true, data: booking })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    const message = error instanceof Error ? error.message : 'Failed to process payment'
    const statusCode = message.includes('not found') ? 404
      : message.includes('Cannot process') ? 409
      : message.includes('Validation failed') ? 400
      : 500
    console.error('[car-rental] Error processing payment:', error)
    return NextResponse.json({ success: false, error: message }, { status: statusCode })
  }
}
