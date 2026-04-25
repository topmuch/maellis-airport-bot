// ─────────────────────────────────────────────────────────────────────────────
// MAELLIS Airport Bot — API Route: GET /api/ticket-scans/stats
// Dashboard stats for ticket scans
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getScanStats } from '@/lib/services/ocr.service'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT', 'VIEWER')(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const stats = await getScanStats()

    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error('[api/ticket-scans/stats] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
