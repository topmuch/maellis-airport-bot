import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getInvoices, createInvoice } from '@/lib/services/billing.service'

// GET /api/invoices — List invoices (admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId') || undefined
    const status = searchParams.get('status') || undefined
    const type = searchParams.get('type') || undefined
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))

    const result = await getInvoices({
      clientId,
      status,
      type,
      dateFrom,
      dateTo,
      page,
      limit,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

// POST /api/invoices — Create invoice (admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const { clientId, type, items, issueDate, dueDate, notes, currency } = body as Record<string, any>

    // Validation
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'clientId is required' },
        { status: 400 }
      )
    }

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'type is required (subscription, commission, marketplace, custom)' },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'items is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate each item
    for (const item of items) {
      if (!item.description || typeof item.description !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Each item must have a valid description' },
          { status: 400 }
        )
      }
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        return NextResponse.json(
          { success: false, error: 'Each item must have a positive quantity' },
          { status: 400 }
        )
      }
      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        return NextResponse.json(
          { success: false, error: 'Each item must have a non-negative unitPrice' },
          { status: 400 }
        )
      }
    }

    const invoice = await createInvoice({
      clientId,
      type,
      items: items.map((item: { description: string; quantity: number; unitPrice: number }) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      issueDate: issueDate ? new Date(issueDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes: notes || undefined,
      currency: currency || undefined,
    })

    return NextResponse.json({ success: true, data: invoice }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating invoice:', error)

    const message = error instanceof Error ? error.message : 'Failed to create invoice'

    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
