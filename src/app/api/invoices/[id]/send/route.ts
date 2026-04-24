import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { markAsSent } from '@/lib/services/billing.service'

// POST /api/invoices/:id/send — Mark invoice as sent + send email to client
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

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    const result = await markAsSent(id)

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Invoice marked as sent and email notification queued',
    })
  } catch (error: unknown) {
    console.error('Error sending invoice:', error)

    const message = error instanceof Error ? error.message : 'Failed to send invoice'

    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 })
    }

    if (message.includes('already sent') || message.includes('Invalid')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to send invoice' },
      { status: 500 }
    )
  }
}
