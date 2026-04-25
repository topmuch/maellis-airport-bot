import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getAlertStats } from '@/lib/services/broadcast-alert.service'

// GET /api/broadcast/alerts/:id/stats — Real-time delivery statistics (SSE-compatible polling)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT')(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const { id } = await params
    const stats = await getAlertStats(id)

    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('not found') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
