import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/auth'
import { updateContact, deleteContact, getContactById } from '@/lib/services/emergency.service'
import { validateId, ValidationError, parseBody } from '@/lib/validate'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/emergency/contacts/[id] — Get contact by ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const { id } = await params
    try {
      validateId(id)
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode })
      }
      throw err
    }
    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/emergency/contacts/[id] — Update contact (admin only)
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const { id } = await params
    try {
      validateId(id)
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode })
      }
      throw err
    }
    const body = await parseBody(request)

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

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error updating emergency contact:', error)

    const internalMessage = error instanceof Error ? error.message : ''

    if (internalMessage.includes('not found')) {
      return NextResponse.json({ success: false, error: 'Emergency contact not found' }, { status: 404 })
    }
    if (internalMessage.startsWith('Invalid category')) {
      return NextResponse.json({ success: false, error: 'Invalid category' }, { status: 400 })
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
    const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT')(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const { id } = await params
    try {
      validateId(id)
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode })
      }
      throw err
    }

    const result = await deleteContact(id)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Emergency contact deleted successfully',
    })
  } catch (error: unknown) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error deleting emergency contact:', error)

    const internalMessage = error instanceof Error ? error.message : ''

    if (internalMessage.includes('not found')) {
      return NextResponse.json({ success: false, error: 'Emergency contact not found' }, { status: 404 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete emergency contact' },
      { status: 500 }
    )
  }
}
