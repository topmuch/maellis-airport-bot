import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { updateVehicle, deleteVehicle } from '@/lib/services/car-rental.service'
import { parseBody, ValidationError } from '@/lib/validate'

// PUT /api/car-rental/vehicles/[id] — Update vehicle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN')
    const authResult = await checkRole(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication required' },
        { status: authResult.status || 401 }
      )
    }

    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    const body = await parseBody(request)
    const vehicle = await updateVehicle(id, body)

    return NextResponse.json({ success: true, data: vehicle })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    const message = error instanceof Error ? error.message : 'Failed to update vehicle'
    const statusCode = message === 'Vehicle not found' ? 404
      : message.includes('Validation failed') ? 400
      : 500
    console.error('[car-rental] Error updating vehicle:', error)
    return NextResponse.json({ success: false, error: message }, { status: statusCode })
  }
}

// DELETE /api/car-rental/vehicles/[id] — Soft delete vehicle (isAvailable = false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN')
    const authResult = await checkRole(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication required' },
        { status: authResult.status || 401 }
      )
    }

    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    const vehicle = await deleteVehicle(id)

    return NextResponse.json({ success: true, data: vehicle })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete vehicle'
    const statusCode = message === 'Vehicle not found' ? 404 : 500
    console.error('[car-rental] Error deleting vehicle:', error)
    return NextResponse.json({ success: false, error: message }, { status: statusCode })
  }
}
