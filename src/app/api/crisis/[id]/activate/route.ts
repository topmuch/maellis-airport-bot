import { NextRequest, NextResponse } from 'next/server'
import { activateCrisisAlert } from '@/lib/services/crisis-broadcast.service'
import { requireRole } from '@/lib/auth'

// ─────────────────────────────────────────────
// PUT /api/crisis/[id]/activate — Activate a draft crisis alert
// ─────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN')
    const authResult = await checkRole(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 })
    }
    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    const alert = await activateCrisisAlert(id)

    return NextResponse.json({
      success: true,
      data: alert,
    })
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 }
        )
      }
      if (error.message.includes('Invalid status transition')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 409 }
        )
      }
    }
    console.error('[PUT /api/crisis/:id/activate] error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
