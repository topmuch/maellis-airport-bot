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

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    const contact = await setPrimary(id)

    return NextResponse.json({
      success: true,
      data: contact,
      message: 'Contact set as primary successfully',
    })
  } catch (error: unknown) {
    console.error('Error setting primary emergency contact:', error)

    const internalMessage = error instanceof Error ? error.message : ''

    if (internalMessage.includes('not found') || internalMessage.includes('Contact ID is required')) {
      return NextResponse.json({ success: false, error: 'Emergency contact not found' }, { status: 404 })
    }
    if (internalMessage.includes('Cannot set inactive')) {
      return NextResponse.json({ success: false, error: 'Cannot set inactive contact as primary' }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to set primary contact' },
      { status: 500 }
    )
  }
}
