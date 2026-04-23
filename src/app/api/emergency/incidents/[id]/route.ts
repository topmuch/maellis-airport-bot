import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { updateIncident } from '@/lib/services/emergency.service'

// PUT /api/emergency/incidents/[id] — Update incident (admin only)
export async function PUT(
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

    const body = await request.json()
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
    console.error('Error updating emergency incident:', error)

    const message = error instanceof Error ? error.message : 'Failed to update emergency incident'

    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 })
    }
    if (message.startsWith('Invalid status')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update emergency incident' },
      { status: 500 }
    )
  }
}
