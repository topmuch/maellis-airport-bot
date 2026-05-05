import { NextRequest, NextResponse } from 'next/server'
import { acknowledgeAlert } from '@/lib/services/broadcast-alert.service'
import { ACKNOWLEDGEMENT_RESPONSES } from '@/lib/services/broadcast-alert.service'

// POST /api/broadcast/alerts/:id/acknowledge — Public endpoint for acknowledging alerts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { userPhone, response, location, userName } = body

    if (!userPhone || typeof userPhone !== 'string' || userPhone.trim().length === 0) {
      return NextResponse.json({ error: 'userPhone is required' }, { status: 400 })
    }

    if (response && !(ACKNOWLEDGEMENT_RESPONSES as readonly string[]).includes(response)) {
      return NextResponse.json(
        { error: `Invalid response. Must be one of: ${ACKNOWLEDGEMENT_RESPONSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Extract IP and User-Agent from request
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
    const userAgent = request.headers.get('user-agent') || null

    const ack = await acknowledgeAlert({
      alertId: id,
      userPhone: userPhone.trim(),
      userName: userName || undefined,
      response: response || undefined,
      location: location || null,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    })

    return NextResponse.json({ success: true, data: ack })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('not found') ? 404 : message.includes('Cannot') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
