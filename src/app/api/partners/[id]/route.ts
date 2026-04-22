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

    const partner = await getPartnerById(id)

    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: partner })
  } catch (error) {
    console.error('Error fetching partner:', error)
    return NextResponse.json(
      { error: 'Failed to fetch partner' },
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
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { id } = await params

    // Verify partner exists
    const existing = await getPartnerById(id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      airportCode,
      type,
      name,
      email,
      phone,
      contactPerson,
      commissionRate,
      contractStart,
      contractEnd,
      logoUrl,
      isActive,
    } = body

    const updated = await updatePartner(id, {
      ...(airportCode !== undefined && { airportCode }),
      ...(type !== undefined && { type }),
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(contactPerson !== undefined && { contactPerson }),
      ...(commissionRate !== undefined && { commissionRate }),
      ...(contractStart !== undefined && { contractStart }),
      ...(contractEnd !== undefined && { contractEnd }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(isActive !== undefined && { isActive }),
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Error updating partner:', error)
    return NextResponse.json(
      { error: 'Failed to update partner' },
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
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { id } = await params

    // Verify partner exists
    const existing = await getPartnerById(id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      )
    }

    const deactivated = await deactivatePartner(id)

    return NextResponse.json({
      data: deactivated,
      message: 'Partner deactivated successfully',
    })
  } catch (error) {
    console.error('Error deactivating partner:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate partner' },
      { status: 500 }
    )
  }
}
