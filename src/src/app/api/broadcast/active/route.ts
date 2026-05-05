import { NextResponse } from 'next/server'
import { getActiveAlerts } from '@/lib/services/broadcast-alert.service'

// GET /api/broadcast/active — Get currently active alerts (for banner display)
// No auth required — public endpoint
export async function GET() {
  try {
    const activeAlerts = await getActiveAlerts()

    const parsedAlerts = activeAlerts.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      level: a.level,
      scope: a.scope,
      channels: JSON.parse(a.channels || '[]'),
      sentAt: a.sentAt,
      expiresAt: a.expiresAt,
    }))

    return NextResponse.json({ success: true, data: parsedAlerts })
  } catch {
    return NextResponse.json({ success: true, data: [] }, { status: 200 })
  }
}
