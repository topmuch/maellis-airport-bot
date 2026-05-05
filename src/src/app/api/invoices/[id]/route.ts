import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/invoices/:id — Get single invoice with items, client, payments
export async function GET(
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

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        InvoiceItem: {
          orderBy: { id: 'asc' },
        },
        BillingClient: true,
        InvoicePayment: {
          orderBy: { paidAt: 'desc' },
        },
        InvoiceReminder: {
          orderBy: { sentAt: 'desc' },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Compute total paid from payments
    const totalPaid = invoice.InvoicePayment
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0)

    return NextResponse.json({
      success: true,
      data: {
        ...invoice,
        totalPaid,
        remainingAmount: Math.max(0, invoice.total - totalPaid),
      },
    })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}

// PATCH /api/invoices/:id — Update invoice status
export async function PATCH(
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

    // Verify invoice exists
    const existing = await db.invoice.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { status, paidAt } = body

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'status is required' },
        { status: 400 }
      )
    }

    const validStatuses = ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Build update data
    const data: Record<string, unknown> = { status }
    if (status === 'paid') {
      data.paidAt = paidAt ? new Date(paidAt) : new Date()
    }
    if (status === 'cancelled') {
      // Optionally clear paidAt when cancelling
      data.paidAt = null
    }

    const updated = await db.invoice.update({
      where: { id },
      data,
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Invoice status updated to ${status}`,
    })
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update invoice' },
      { status: 500 }
    )
  }
}
