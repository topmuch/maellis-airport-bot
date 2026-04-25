import { NextRequest, NextResponse } from 'next/server'
import { updateOrderStatus } from '@/lib/services/health-pharmacy.service'
import { requireRole } from '@/lib/auth'
import { validateId, ValidationError, parseBody } from '@/lib/validate'

// PATCH /api/pharmacy/orders/[id] — Update pharmacy order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN', 'PARTNER')(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
  }

  try {
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
    const { status } = body

    if (!status || typeof status !== 'string') {
      return NextResponse.json(
        { success: false, error: 'status is required and must be a string' },
        { status: 400 }
      )
    }

    const result = await updateOrderStatus(id, status)

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Pharmacy order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error updating pharmacy order status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update pharmacy order status' },
      { status: 500 }
    )
  }
}
