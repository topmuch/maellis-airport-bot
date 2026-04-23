import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { updateContact, deleteContact } from '@/lib/services/emergency.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/emergency/contacts/[id] — Update contact (admin only)
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
    const body = await request.json()

    // At least one field must be provided
    const updatableFields = [
      'airportCode', 'category', 'name', 'phoneNumber', 'whatsappNum',
      'email', 'isPrimary', 'isActive', 'notes',
    ]
    const hasUpdate = updatableFields.some((field) => body[field] !== undefined)

    if (!hasUpdate) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const updated = await updateContact(id, body)

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Emergency contact updated successfully',
    })
  } catch (error: unknown) {
    console.error('Error updating emergency contact:', error)

    const message = error instanceof Error ? error.message : 'Failed to update emergency contact'

    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 })
    }
    if (message.startsWith('Invalid category')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update emergency contact' },
      { status: 500 }
    )
  }
}

// DELETE /api/emergency/contacts/[id] — Delete contact (admin only)
export async function DELETE(
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

    const result = await deleteContact(id)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Emergency contact deleted successfully',
    })
  } catch (error: unknown) {
    console.error('Error deleting emergency contact:', error)

    const message = error instanceof Error ? error.message : 'Failed to delete emergency contact'

    if (message.includes('not found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete emergency contact' },
      { status: 500 }
    )
  }
}
