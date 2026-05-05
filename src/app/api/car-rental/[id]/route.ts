import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getPartnerById, updatePartner, deletePartner } from '@/lib/services/car-rental.service'
import { parseBody, ValidationError } from '@/lib/validate'

// GET /api/car-rental/[id] — Get single partner (SUPERADMIN, AIRPORT_ADMIN)
export async function GET(
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
    const partner = await getPartnerById(id)
    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Car rental partner not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: partner })
  } catch (error) {
    console.error('[car-rental] Error fetching partner:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch car rental partner' },
      { status: 500 }
    )
  }
}

// PUT /api/car-rental/[id] — Update partner (SUPERADMIN only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const checkRole = requireRole('SUPERADMIN')
    const authResult = await checkRole(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication required' },
        { status: authResult.status || 401 }
      )
    }

    const { id } = await params
    const body = await parseBody(request)

    const partner = await updatePartner(id, body)

    return NextResponse.json({ success: true, data: partner })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    const message = error instanceof Error ? error.message : 'Failed to update car rental partner'
    const statusCode = message.includes('not found') ? 404 : message.includes('Validation failed') ? 400 : 500
    console.error('[car-rental] Error updating partner:', error)
    return NextResponse.json({ success: false, error: message }, { status: statusCode })
  }
}

// DELETE /api/car-rental/[id] — Soft-delete partner (SUPERADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const checkRole = requireRole('SUPERADMIN')
    const authResult = await checkRole(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication required' },
        { status: authResult.status || 401 }
      )
    }

    const { id } = await params
    const partner = await deletePartner(id)

    return NextResponse.json({ success: true, data: partner })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete car rental partner'
    const statusCode = message.includes('not found') ? 404 : 500
    console.error('[car-rental] Error deleting partner:', error)
    return NextResponse.json({ success: false, error: message }, { status: statusCode })
  }
}
