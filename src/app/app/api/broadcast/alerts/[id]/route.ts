import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireAuth } from '@/lib/auth'
import {
  getAlertById,
  sendAlert,
  estimateRecipients,
  ALERT_SCOPES,
} from '@/lib/services/broadcast-alert.service'

// GET /api/broadcast/alerts/:id — Get alert details (auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const { id } = await params
    const alert = await getAlertById(id)

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: alert })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/broadcast/alerts/:id — Send/activate alert (SUPERADMIN only)
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
    const result = await sendAlert(id, auth.user.id)

    return NextResponse.json({
      success: true,
      alertId: result.alert.id,
      estimatedRecipients: result.estimatedRecipients,
      deliveriesCreated: result.deliveriesCreated,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('not found') ? 404 : message.includes('Cannot') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// GET /api/broadcast/alerts/estimate — Estimate recipients for a scope
export async function PUT(
  request: NextRequest,
  _context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireRole('SUPERADMIN')(request)
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
