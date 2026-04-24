import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/clients/:id — Get single client (admin only)
export async function GET(
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

    const client = await db.billingClient.findUnique({
      where: { id },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { invoices: true },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: client })
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch client' },
      { status: 500 }
    )
  }
}

// PATCH /api/clients/:id — Update client (admin only)
export async function PATCH(
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

    // Verify client exists
    const existing = await db.billingClient.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, email, phone, company, taxId, address, currency, taxRate, isActive, notes } = body

    // Build update data — only include provided fields
    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = String(name).trim()
    if (email !== undefined) {
      if (typeof email !== 'string' || !email.includes('@')) {
        return NextResponse.json(
          { success: false, error: 'email must be a valid email address' },
          { status: 400 }
        )
      }
      data.email = email.trim().toLowerCase()
    }
    if (phone !== undefined) data.phone = String(phone).trim()
    if (company !== undefined) data.company = company || null
    if (taxId !== undefined) data.taxId = taxId || null
    if (address !== undefined) data.address = typeof address === 'string' ? address : JSON.stringify(address)
    if (currency !== undefined) data.currency = currency
    if (taxRate !== undefined) data.taxRate = Number(taxRate)
    if (isActive !== undefined) data.isActive = Boolean(isActive)
    if (notes !== undefined) data.notes = notes || null

    const updated = await db.billingClient.update({
      where: { id },
      data,
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Client updated successfully',
    })
  } catch (error: unknown) {
    console.error('Error updating client:', error)

    const message = error instanceof Error ? error.message : 'Failed to update client'

    if (message.includes('already exists') || message.includes('Unique')) {
      return NextResponse.json(
        { success: false, error: 'A client with this email already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update client' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/:id — Delete client (admin only)
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

    // Verify client exists
    const existing = await db.billingClient.findUnique({
      where: { id },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // Check if client has invoices — prevent deletion if so
    if (existing._count.invoices > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete client: ${existing._count.invoices} invoice(s) are linked to this client. Cancel or reassign them first.`,
        },
        { status: 400 }
      )
    }

    await db.billingClient.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete client' },
      { status: 500 }
    )
  }
}
