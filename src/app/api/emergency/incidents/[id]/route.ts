import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/auth'
import { getIncidentById, updateIncident } from '@/lib/services/emergency.service'
import { parseBody, ValidationError } from '@/lib/validate'

// GET /api/emergency/incidents/[id] — Get incident by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/emergency/incidents/[id] — Update incident (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT')(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    const body = await parseBody(request)
    const { status, assignedTo, resolution } = body

    // At least one field must be provided
    if (!status && !assignedTo && !resolution) {
      return NextResponse.json(
        { success: false, error: 'At least one of status, assignedTo, or resolution must be provided' },
        { status: 400 }
      )
    }

    const updated = await updateIncident(id, {
      status: status || undefined,
      assignedTo: assignedTo || undefined,
      resolution: resolution || undefined,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error updating emergency incident:', error)

    const internalMessage = error instanceof Error ? error.message : ''

    if (internalMessage.includes('not found')) {
      return NextResponse.json({ success: false, error: 'Emergency incident not found' }, { status: 404 })
    }
    if (internalMessage.startsWith('Invalid status')) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update emergency incident' },
      { status: 500 }
    )
  }
}
