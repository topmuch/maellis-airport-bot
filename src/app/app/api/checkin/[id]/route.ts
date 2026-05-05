import { NextRequest, NextResponse } from 'next/server'
import { updateCheckInStatus } from '@/lib/services/checkin.service'
import { requireRole } from '@/lib/auth'
import { validateId, ValidationError, parseBody } from '@/lib/validate'

// PATCH /api/checkin/[id] — Update check-in session status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request)
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
    const { status, errorMessage } = body

    if (!status || typeof status !== 'string') {
      return NextResponse.json(
        { success: false, error: 'status is required and must be a string' },
        { status: 400 }
      )
    }

    const extraData: { errorMessage?: string } = {}
    if (errorMessage !== undefined && errorMessage !== null) {
      extraData.errorMessage = errorMessage
    }

    const result = await updateCheckInStatus(id, status, extraData)

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Check-in session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error updating check-in session status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update check-in session status' },
      { status: 500 }
    )
  }
}
