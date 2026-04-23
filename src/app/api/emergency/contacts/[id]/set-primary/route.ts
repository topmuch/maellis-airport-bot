import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { setPrimary } from '@/lib/services/emergency.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/emergency/contacts/[id]/set-primary — Promote contact to primary
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
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

    const contact = await setPrimary(id)

    return NextResponse.json({
      success: true,
      data: contact,
      message: 'Contact set as primary successfully',
    })
  } catch (error: unknown) {
    console.error('Error setting primary emergency contact:', error)

    const message = error instanceof Error ? error.message : 'Failed to set primary contact'

    if (message.includes('not found') || message.includes('Contact ID is required')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 })
    }
    if (message.includes('Cannot set inactive')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to set primary contact' },
      { status: 500 }
    )
  }
}
