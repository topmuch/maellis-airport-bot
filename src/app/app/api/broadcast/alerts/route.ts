import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import {
  createAlert,
  getAlerts,
  ALERT_LEVELS,
  ALERT_SCOPES,
  CHANNELS,
} from '@/lib/services/broadcast-alert.service'

// POST /api/broadcast/alerts — Create a new broadcast alert (SUPERADMIN only)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole('SUPERADMIN')(request)
    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const body = await request.json()
    const { title, message, level, scope, scopeFilter, channels, scheduledAt, expiresAt } = body

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }
    if (title.trim().length > 200) {
      return NextResponse.json({ error: 'title must be at most 200 characters' }, { status: 400 })
    }
    if (message.trim().length > 5000) {
      return NextResponse.json({ error: 'message must be at most 5000 characters' }, { status: 400 })
    }

    // Validate optional enums
    if (level && !(ALERT_LEVELS as readonly string[]).includes(level)) {
      return NextResponse.json(
        { error: `Invalid level. Must be one of: ${ALERT_LEVELS.join(', ')}` },
        { status: 400 }
      )
    }
    if (scope && !(ALERT_SCOPES as readonly string[]).includes(scope)) {
      return NextResponse.json(
        { error: `Invalid scope. Must be one of: ${ALERT_SCOPES.join(', ')}` },
        { status: 400 }
      )
    }
    if (channels && Array.isArray(channels)) {
      const invalidChannels = channels.filter((c) => !(CHANNELS as readonly string[]).includes(c))
      if (invalidChannels.length > 0) {
        return NextResponse.json(
          { error: `Invalid channels: ${invalidChannels.join(', ')}. Must be one of: ${CHANNELS.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const alert = await createAlert({
      title: title.trim(),
      message: message.trim(),
      level: level || undefined,
      scope: scope || undefined,
      scopeFilter: scopeFilter || null,
      channels: channels || ['dashboard'],
      scheduledAt: scheduledAt || null,
      expiresAt: expiresAt || null,
      createdBy: auth.user.id,
    })

    return NextResponse.json(
      {
        success: true,
        alertId: alert.id,
        data: {
          ...alert,
          channels: JSON.parse(alert.channels || '[]'),
          scopeFilter: alert.scopeFilter ? JSON.parse(String(alert.scopeFilter)) : null,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/broadcast/alerts — List alerts (SUPERADMIN + AIRPORT_ADMIN)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const level = searchParams.get('level') || undefined
    const scope = searchParams.get('scope') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined

    const result = await getAlerts({
      status,
      level,
      scope,
      page,
      limit,
      dateFrom,
      dateTo,
    })

    // Parse JSON fields for each alert
    const parsedAlerts = result.alerts.map((alert) => ({
      ...alert,
      channels: JSON.parse(alert.channels || '[]'),
      scopeFilter: alert.scopeFilter ? JSON.parse(String(alert.scopeFilter)) : null,
    }))

    return NextResponse.json({
      success: true,
      data: parsedAlerts,
      pagination: result.pagination,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
