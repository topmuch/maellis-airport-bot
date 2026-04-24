import { NextRequest, NextResponse } from 'next/server'
import { updateRebookingStatus } from '@/lib/services/rebooking.service'

// PATCH /api/rebooking/[id] - Update rebooking status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
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
    console.error('Error updating rebooking status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update rebooking status' },
      { status: 500 }
    )
  }
}
