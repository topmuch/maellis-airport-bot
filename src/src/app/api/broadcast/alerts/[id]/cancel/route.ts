import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { cancelAlert } from '@/lib/services/broadcast-alert.service'

// POST /api/broadcast/alerts/:id/cancel — Cancel an active alert (SUPERADMIN only, within 60s)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole('SUPERADMIN')(request)
    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const { id } = await params
    const updated = await cancelAlert(id, auth.user.id)

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        channels: JSON.parse(updated.channels || '[]'),
        scopeFilter: updated.scopeFilter ? JSON.parse(String(updated.scopeFilter)) : null,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('not found') ? 404 : message.includes('Cannot') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
