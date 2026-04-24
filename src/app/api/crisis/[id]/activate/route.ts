import { NextRequest, NextResponse } from 'next/server'
import { activateCrisisAlert } from '@/lib/services/crisis-broadcast.service'

// ─────────────────────────────────────────────
// PUT /api/crisis/[id]/activate — Activate a draft crisis alert
// ─────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Alert ID is required' },
        { status: 400 }
      )
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
