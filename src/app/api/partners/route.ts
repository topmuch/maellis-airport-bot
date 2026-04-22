import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getPartners, createPartner } from '@/lib/services/partner.service'
import { sendPartnerInvitation } from '@/lib/email'

// GET /api/partners?airport=DSS&type=travel_agency — List partners (admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const airportCode = searchParams.get('airport') || undefined
    const type = searchParams.get('type') || undefined

    const partners = await getPartners(airportCode, type)

    return NextResponse.json({ data: partners })
  } catch (error) {
    console.error('Error fetching partners:', error)
    return NextResponse.json(
      { error: 'Failed to fetch partners' },
      { status: 500 }
    )
  }
}

// POST /api/partners — Create partner (admin only, send invitation email)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
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
    } = body

    if (!airportCode || !type || !name || !email || !phone || !contactPerson || !contractStart) {
      return NextResponse.json(
        { error: 'airportCode, type, name, email, phone, contactPerson, and contractStart are required' },
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
    })

    // Send partner invitation email (fire-and-forget)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'
    try {
      await sendPartnerInvitation(email, {
        partnerName: name,
        airportCode,
        contactPerson,
        setupUrl: `${baseUrl}/partner/setup`,
      })
    } catch (emailError) {
      console.error('Failed to send partner invitation email:', emailError)
      // Don't fail the request — the partner is still created
    }

    return NextResponse.json({ data: partner }, { status: 201 })
  } catch (error) {
    console.error('Error creating partner:', error)
    return NextResponse.json(
      { error: 'Failed to create partner' },
      { status: 500 }
    )
  }
}
