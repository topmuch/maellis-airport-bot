import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { estimateRecipients, ALERT_SCOPES } from '@/lib/services/broadcast-alert.service'

// POST /api/broadcast/estimate — Estimate recipient count for a scope
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const body = await request.json()
    const { scope, scopeFilter } = body

    if (!scope || !(ALERT_SCOPES as readonly string[]).includes(scope)) {
      return NextResponse.json(
        { error: `Invalid scope. Must be one of: ${ALERT_SCOPES.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await estimateRecipients(scope, scopeFilter || null)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
