import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getPartners, createPartner, invitePartner } from '@/lib/services/partner.service'
import { sendPartnerInvitation } from '@/lib/email'

// GET /api/partners?airport=DSS&type=travel_agency&status=active — List partners (admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const airportCode = searchParams.get('airport') || undefined
    const type = searchParams.get('type') || undefined
    const status = searchParams.get('status') || undefined

    const partners = await getPartners(airportCode, type, status)

    return NextResponse.json({ success: true, data: partners })
  } catch (error) {
    console.error('Error fetching partners:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch partners' },
      { status: 500 }
    )
  }
}

// POST /api/partners — Create or invite partner (admin only)
// If body has sendInvitation: true, calls invitePartner (generates JWT token, sends email)
// Otherwise, calls createPartner (direct creation, status=pending)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()
    const {
      airportCode,
      type,
      name,
      email,
      phone,
      contactPerson,
      commissionRate,
      contractStart,
      contractEnd,
      logoUrl,
      notes,
      sendInvitation,
    } = body

    if (!airportCode || !type || !name || !email || !phone || !contactPerson) {
      return NextResponse.json(
        { success: false, error: 'airportCode, type, name, email, phone, and contactPerson are required' },
        { status: 400 }
      )
    }

    if (sendInvitation) {
      // ── Invitation flow: generate JWT token, send email ──
      const result = await invitePartner({
        airportCode,
        type,
        name,
        email,
        phone,
        contactPerson,
        commissionRate: commissionRate || undefined,
        contractStart: contractStart || undefined,
        contractEnd: contractEnd || undefined,
        logoUrl: logoUrl || undefined,
        notes: notes || undefined,
      })

      // Send partner invitation email (fire-and-forget)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'
      const setupUrl = `${baseUrl}/partner/setup?token=${result.inviteToken}`
      try {
        await sendPartnerInvitation(email, {
          partnerName: name,
          airportCode,
          contactPerson,
          setupUrl,
        })
      } catch (emailError) {
        console.error('Failed to send partner invitation email:', emailError)
        // Don't fail the request — the partner is still created
      }

      return NextResponse.json({ success: true, data: result }, { status: 201 })
    } else {
      // ── Direct creation flow ──
      if (!contractStart) {
        return NextResponse.json(
          { success: false, error: 'contractStart is required when not sending invitation' },
          { status: 400 }
        )
      }

      const partner = await createPartner({
        airportCode,
        type,
        name,
        email,
        phone,
        contactPerson,
        commissionRate: commissionRate || undefined,
        contractStart,
        contractEnd: contractEnd || undefined,
        logoUrl: logoUrl || undefined,
        notes: notes || undefined,
      })

      return NextResponse.json({ success: true, data: partner }, { status: 201 })
    }
  } catch (error: unknown) {
    console.error('Error creating partner:', error)

    const message = error instanceof Error ? error.message : 'Failed to create partner'

    if (message.includes('already exists')) {
      return NextResponse.json({ success: false, error: message }, { status: 409 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create partner' },
      { status: 500 }
    )
  }
}
