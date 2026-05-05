import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import {
  getPartnerById,
  updatePartner,
  deactivatePartner,
} from '@/lib/services/partner.service'

// GET /api/partners/[id] — Get partner
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    const partner = await getPartnerById(id)

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: partner })
  } catch (error) {
    console.error('Error fetching partner:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch partner' },
      { status: 500 }
    )
  }
}

// PUT /api/partners/[id] — Update partner (admin only)
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

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    // Verify partner exists
    const existing = await getPartnerById(id)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }

    const body = await request.json()

    const updated = await updatePartner(id, body)

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Partner updated successfully',
    })
  } catch (error: unknown) {
    console.error('Error updating partner:', error)

    const message = error instanceof Error ? error.message : 'Failed to update partner'

    if (message === 'Partner not found') {
      return NextResponse.json({ success: false, error: message }, { status: 404 })
    }
    if (message.includes('already exists')) {
      return NextResponse.json({ success: false, error: message }, { status: 409 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update partner' },
      { status: 500 }
    )
  }
}

// DELETE /api/partners/[id] — Deactivate partner (admin only)
export async function DELETE(
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

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    // Verify partner exists
    const existing = await getPartnerById(id)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }

    const deactivated = await deactivatePartner(id)

    return NextResponse.json({
      success: true,
      data: deactivated,
      message: 'Partner deactivated successfully',
    })
  } catch (error: unknown) {
    console.error('Error deactivating partner:', error)

    const message = error instanceof Error ? error.message : 'Failed to deactivate partner'

    if (message === 'Partner not found') {
      return NextResponse.json({ success: false, error: message }, { status: 404 })
    }
    if (message.includes('already inactive')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to deactivate partner' },
      { status: 500 }
    )
  }
}
