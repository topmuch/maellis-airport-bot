import { NextRequest, NextResponse } from 'next/server'
import { updateTicketStatus } from '@/lib/services/concierge.service'
import { requireRole } from '@/lib/auth'
import { parseBody, ValidationError } from '@/lib/validate'

// PUT /api/concierge/tickets/[id]/status — Update ticket status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT')(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
  }

  try {
    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    const body = await parseBody(request)
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

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error updating concierge ticket status:', error)
    const internalMessage = error instanceof Error ? error.message : ''

    let statusCode = 500
    if (internalMessage.includes('not found')) statusCode = 404
    else if (internalMessage.includes('Cannot transition')) statusCode = 409
    else if (internalMessage.includes('Invalid')) statusCode = 400

    return NextResponse.json({ success: false, error: 'Failed to update ticket status' }, { status: statusCode })
  }
}
