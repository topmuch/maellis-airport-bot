import { NextRequest, NextResponse } from 'next/server'
import { createTicket, getTickets } from '@/lib/services/concierge.service'

// GET /api/concierge/tickets?status=xxx&type=xxx&priority=xxx&phone=xxx&page=1&limit=20
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const type = searchParams.get('type') || undefined
    const priority = searchParams.get('priority') || undefined
    const phone = searchParams.get('phone') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const result = await getTickets({ status, type, priority, phone, page, limit })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error fetching concierge tickets:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/concierge/tickets — Create a new concierge ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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
    console.error('Error creating concierge ticket:', error)
    const message = error instanceof Error ? error.message : 'Failed to create ticket'
    const statusCode = message.includes('Invalid') ? 400 : 500
    return NextResponse.json({ success: false, error: message }, { status: statusCode })
  }
}
