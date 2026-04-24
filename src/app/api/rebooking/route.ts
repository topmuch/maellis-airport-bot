import { NextRequest, NextResponse } from 'next/server'
import {
  getRebookingLogs,
  createRebookingAlert,
  getRebookingStats,
} from '@/lib/services/rebooking.service'
import { requireAuth, requireRole } from '@/lib/auth'
import { parseBody, ValidationError } from '@/lib/validate'

// GET /api/rebooking - List rebooking logs and stats
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    const stats = searchParams.get('stats')

    // If stats requested, return rebooking stats
    if (stats === 'true') {
      const rebookingStats = await getRebookingStats()
      return NextResponse.json({ success: true, data: rebookingStats })
    }

    // Otherwise, return rebooking logs
    const logs = await getRebookingLogs(phone || undefined)

    return NextResponse.json({ success: true, data: logs })
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error fetching rebooking data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rebooking data' },
      { status: 500 }
    )
  }
}

// POST /api/rebooking - Create a rebooking alert
export async function POST(request: NextRequest) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT')(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
  }

  try {
    const body = await parseBody(request)
    const { phone, originalFlight } = body

    if (!phone || !originalFlight) {
      return NextResponse.json(
        { success: false, error: 'phone and originalFlight are required' },
        { status: 400 }
      )
    }

    const alert = await createRebookingAlert({
      phone,
      passengerName: body.passengerName,
      originalFlight,
      originalAirline: body.originalAirline,
      originalDepCode: body.originalDepCode,
      originalArrCode: body.originalArrCode,
      suggestedFlight: body.suggestedFlight,
      suggestedAirline: body.suggestedAirline,
      suggestedDepTime: body.suggestedDepTime,
      suggestedPrice: body.suggestedPrice,
    })

    return NextResponse.json({ success: true, data: alert }, { status: 201 })
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error creating rebooking alert:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create rebooking alert' },
      { status: 500 }
    )
  }
}
