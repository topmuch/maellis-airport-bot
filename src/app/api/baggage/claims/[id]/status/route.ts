import { NextRequest, NextResponse } from 'next/server'
import { updateClaimStatus } from '@/lib/services/baggage-claims.service'
import { requireRole } from '@/lib/auth'

// PUT /api/baggage/claims/[id]/status — Update claim status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT')
  const authResult = await checkRole(request)
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 })
  }
  try {
    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

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
