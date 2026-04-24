import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/auth'
import {
  getProviderById,
  updateProvider,
  deleteProvider,
} from '@/lib/services/transport.service'
import { parseBody, ValidationError } from '@/lib/validate'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/transport/providers/[id]
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

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    const provider = await getProviderById(id)

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Transport provider not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: provider })
  } catch (error) {
    console.error('Error fetching transport provider:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transport provider' },
      { status: 500 }
    )
  }
}

// PUT /api/transport/providers/[id] — Update provider (admin only)
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request)

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 401 }
      )
    }

    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    const body = await parseBody(request)

    const existing = await getProviderById(id)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Transport provider not found' },
        { status: 404 }
      )
    }

    // Validate type if provided
    if (body.type) {
      const validTypes = ['taxi', 'vtc', 'shuttle', 'private']
      if (!validTypes.includes(body.type)) {
        return NextResponse.json(
          { success: false, error: `type must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Validate numeric fields if provided
    const numericFields = ['baseFare', 'perKmRate', 'minFare', 'nightSurcharge']
    for (const field of numericFields) {
      if (body[field] !== undefined && (typeof body[field] !== 'number' || body[field] < 0)) {
        return NextResponse.json(
          { success: false, error: `${field} must be a non-negative number` },
          { status: 400 }
        )
      }
    }

    const provider = await updateProvider(id, body)

    return NextResponse.json({ success: true, data: provider })
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Error updating transport provider:', error)

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { success: false, error: 'A provider with this name already exists for this airport' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update transport provider' },
      { status: 500 }
    )
  }
}

// DELETE /api/transport/providers/[id] — Soft-delete provider (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request)

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 401 }
      )
    }

    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    const existing = await getProviderById(id)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Transport provider not found' },
        { status: 404 }
      )
    }

    const result = await deleteProvider(id)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Transport provider deactivated successfully',
    })
  } catch (error: unknown) {
    console.error('Error deleting transport provider:', error)

    return NextResponse.json(
      { success: false, error: 'Failed to delete transport provider' },
      { status: 500 }
    )
  }
}
