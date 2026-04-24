import { NextRequest, NextResponse } from 'next/server'
import { createTicket, getTickets } from '@/lib/services/concierge.service'
import { requireAuth } from '@/lib/auth'
import { parseBody, ValidationError } from '@/lib/validate'

// GET /api/concierge/tickets?status=xxx&type=xxx&priority=xxx&phone=xxx&page=1&limit=20
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const type = searchParams.get('type') || undefined
    const priority = searchParams.get('priority') || undefined
    const phone = searchParams.get('phone') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 1))

    const result = await getTickets({ status, type, priority, phone, page, limit })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error fetching concierge tickets:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/concierge/tickets — Create a new concierge ticket
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
  }

  try {
    const body = await parseBody(request)
    const { phone, passengerName, type, priority, description, flightNumber, gate, category } = body

    if (!phone || !passengerName || !type || !description) {
      return NextResponse.json(
        { success: false, error: 'phone, passengerName, type, and description are required' },
        { status: 400 }
      )
    }

    const ticket = await createTicket({
      phone,
      passengerName,
      type,
      priority: priority || undefined,
      description,
      flightNumber: flightNumber || undefined,
      gate: gate || undefined,
      category: category || undefined,
    })

    return NextResponse.json({ success: true, data: ticket }, { status: 201 })
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error creating concierge ticket:', error)
    const internalMessage = error instanceof Error ? error.message : ''
    const statusCode = internalMessage.includes('Invalid') ? 400 : 500
    return NextResponse.json({ success: false, error: 'Failed to create ticket' }, { status: statusCode })
  }
}
