import { NextRequest, NextResponse } from 'next/server'
import { activatePartner } from '@/lib/services/partner.service'
import { sendPartnerInvitation } from '@/lib/email'

// POST /api/partners/activate — Activate a partner from an invite token
// Body: { token, email, name, phone, password }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, email, name, phone, password } = body

    if (!token || !name || !password) {
      return NextResponse.json(
        { success: false, error: 'token, name, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    const result = await activatePartner(token, {
      name,
      password,
      phone: phone || undefined,
    })

    // Send confirmation email (fire-and-forget)
    if (result.partner?.email) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'
      try {
        await sendPartnerInvitation(result.partner.email, {
          partnerName: result.partner.name,
          airportCode: result.partner.airportCode,
          contactPerson: name,
          setupUrl: `${baseUrl}/partner/dashboard`,
        })
      } catch (emailError) {
        console.error('Failed to send partner activation confirmation email:', emailError)
        // Don't fail the request — the partner is already activated
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: unknown) {
    console.error('Error activating partner:', error)

    const message = error instanceof Error ? error.message : 'Failed to activate partner'

    // Known activation errors
    if (
      message.includes('expired') ||
      message.includes('Invalid invitation token') ||
      message.includes('Token mismatch') ||
      message.includes('Verification failed')
    ) {
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }
    if (message.includes('not found') || message.includes('already been activated')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }
    if (message.includes('at least 8 characters')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }
    if (message === 'Name and password are required') {
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to activate partner' },
      { status: 500 }
    )
  }
}
