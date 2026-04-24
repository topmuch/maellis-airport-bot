import { NextRequest, NextResponse } from 'next/server'
import { updateTicketStatus } from '@/lib/services/concierge.service'

// PUT /api/concierge/tickets/[id]/status — Update ticket status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, resolution, assignedTo } = body

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'status is required' },
        { status: 400 }
      )
    }

    const ticket = await updateTicketStatus(
      id,
      status,
      resolution || undefined,
      assignedTo || undefined
    )

    return NextResponse.json({ success: true, data: ticket })
  } catch (error) {
    console.error('Error updating concierge ticket status:', error)
    const message = error instanceof Error ? error.message : 'Failed to update ticket status'

    let statusCode = 500
    if (message.includes('not found')) statusCode = 404
    else if (message.includes('Cannot transition')) statusCode = 409
    else if (message.includes('Invalid')) statusCode = 400

    return NextResponse.json({ success: false, error: message }, { status: statusCode })
  }
}
