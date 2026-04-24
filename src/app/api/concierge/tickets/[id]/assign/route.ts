import { NextRequest, NextResponse } from 'next/server'
import { assignTicket } from '@/lib/services/concierge.service'
import { requireRole } from '@/lib/auth'
import { parseBody, ValidationError } from '@/lib/validate'

// PUT /api/concierge/tickets/[id]/assign — Assign ticket to an agent
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

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error assigning concierge ticket:', error)
    const internalMessage = error instanceof Error ? error.message : ''
    const statusCode = internalMessage.includes('not found') ? 404 : 500
    return NextResponse.json({ success: false, error: 'Failed to assign ticket' }, { status: statusCode })
  }
}
