import { NextRequest, NextResponse } from 'next/server'
import { updateClaimStatus } from '@/lib/services/baggage-claims.service'

// PUT /api/baggage/claims/[id]/status — Update claim status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, resolution, compensation, assignedTo } = body

    if (!status) {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      )
    }

    const claim = await updateClaimStatus(id, status, {
      resolution: resolution || undefined,
      compensation: compensation !== undefined ? compensation : undefined,
      assignedTo: assignedTo || undefined,
    })

    return NextResponse.json(claim)
  } catch (error) {
    console.error('Error updating baggage claim status:', error)
    const message = error instanceof Error ? error.message : 'Failed to update baggage claim status'
    const statusCode = message.includes('not found') ? 404 : 500
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
