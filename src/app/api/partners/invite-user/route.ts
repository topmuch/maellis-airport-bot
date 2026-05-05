import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { invitePartnerUser } from '@/lib/services/partner.service'
import { sendPartnerInvitation } from '@/lib/email'
import { parseBody, ValidationError } from '@/lib/validate'

// POST /api/partners/invite-user — Invite user to partner (admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await parseBody(request)
    const { partnerId, email, name, role } = body

    if (!partnerId || !email || !name) {
      return NextResponse.json(
        { error: 'partnerId, email, and name are required' },
        { status: 400 }
      )
    }

    // Validate role
    if (role && !['agent', 'manager'].includes(role)) {
      return NextResponse.json(
        { error: 'role must be one of: agent, manager' },
        { status: 400 }
      )
    }

    // Invite the user and get the plain password
    const { user, plainPassword } = await invitePartnerUser(partnerId, {
      email,
      name,
      role: role || undefined,
    })

    // Send invitation email with the plain password (fire-and-forget)
    // Note: For partner user invitations we reuse sendPartnerInvitation
    // which requires a setup URL. We include credentials info in the body.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'
    try {
      await sendPartnerInvitation(email, {
        partnerName: 'MAELLIS Airport',
        airportCode: 'DSS',
        contactPerson: name,
        setupUrl: `${baseUrl}/partner/login`,
      })
    } catch (emailError) {
      console.error('Failed to send partner user invitation email:', emailError)
      // Don't fail the request — the user is still created
      // The admin should be informed that the email failed
    }

    return NextResponse.json(
      {
        data: user,
        message: 'Partner user invited successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to invite partner user'

    if (message === 'Partner not found') {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message === 'Cannot invite users to an inactive partner') {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    console.error('Error inviting partner user:', error)
    return NextResponse.json(
      { error: 'Failed to invite partner user' },
      { status: 500 }
    )
  }
}
