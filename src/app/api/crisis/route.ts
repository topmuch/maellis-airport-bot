import { NextRequest, NextResponse } from 'next/server'
import {
  createCrisisAlert,
  getCrisisAlerts,
} from '@/lib/services/crisis-broadcast.service'

// ─────────────────────────────────────────────
// GET /api/crisis?airportCode=xxx&status=xxx&severity=xxx&page=1&limit=20
// ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const airportCode = searchParams.get('airportCode') || undefined
    const status = searchParams.get('status') || undefined
    const severity = searchParams.get('severity') || undefined
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.max(1, Number(searchParams.get('limit')) || 20)

    const result = await getCrisisAlerts(airportCode, status, severity, page, limit)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('[GET /api/crisis] error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────
// POST /api/crisis — Create a new crisis alert
// ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      airportCode,
      title,
      description,
      severity,
      targetType,
      targetValue,
      message,
      createdBy,
    } = body

    // Validate required fields
    if (!title || !description || !message) {
      return NextResponse.json(
        { success: false, error: 'title, description, and message are required' },
        { status: 400 }
      )
    }

    const alert = await createCrisisAlert({
      airportCode,
      title,
      description,
      severity,
      targetType,
      targetValue,
      message,
      createdBy,
    })

    return NextResponse.json(
      { success: true, data: alert },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/crisis] error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
