import { NextRequest, NextResponse } from 'next/server'
import { assignTicket } from '@/lib/services/concierge.service'

// PUT /api/concierge/tickets/[id]/assign — Assign ticket to an agent
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { assignedTo } = body

    if (!assignedTo) {
      return NextResponse.json(
        { success: false, error: 'assignedTo is required' },
        { status: 400 }
      )
    }

    const ticket = await assignTicket(id, assignedTo)

    return NextResponse.json({ success: true, data: ticket })
  } catch (error) {
    console.error('Error assigning concierge ticket:', error)
    const message = error instanceof Error ? error.message : 'Failed to assign ticket'
    const statusCode = message.includes('not found') ? 404 : 500
    return NextResponse.json({ success: false, error: message }, { status: statusCode })
  }
}
