// ─────────────────────────────────────────────────────────────────────────────
// MAELLIS Airport Bot — API Route: GET/PATCH /api/ticket-scans
// Admin endpoints for managing ticket scans
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getScans, confirmScan, rejectScan } from '@/lib/services/ocr.service'

// GET /api/ticket-scans — List all scans (admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone') || undefined
    const status = searchParams.get('status') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const result = await getScans({ phone, status, page, limit })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[api/ticket-scans] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/ticket-scans — Update scan status (confirm/reject)
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const body = await request.json()
    const { scanId, action } = body

    if (!scanId) {
      return NextResponse.json({ error: 'scanId is required' }, { status: 400 })
    }

    if (!action || !['confirm', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be "confirm" or "reject"' }, { status: 400 })
    }

    let result
    if (action === 'confirm') {
      result = await confirmScan(scanId)
    } else {
      result = await rejectScan(scanId)
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('[api/ticket-scans] PATCH error:', error)
    const internalMessage = error instanceof Error ? error.message : ''
    const status = internalMessage.includes('not found') ? 404 : 500
    return NextResponse.json({ error: 'Internal server error' }, { status })
  }
}
