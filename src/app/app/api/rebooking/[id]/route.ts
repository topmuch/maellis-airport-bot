import { NextRequest, NextResponse } from 'next/server'
import { updateRebookingStatus } from '@/lib/services/rebooking.service'
import { requireRole } from '@/lib/auth'
import { validateId, ValidationError, parseBody } from '@/lib/validate'

// PATCH /api/rebooking/[id] - Update rebooking status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT')(request)
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
    const { status, response } = body

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'status is required' },
        { status: 400 }
      )
    }

    const result = await updateRebookingStatus(id, status, response)

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Rebooking log not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error updating rebooking status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update rebooking status' },
      { status: 500 }
    )
  }
}
