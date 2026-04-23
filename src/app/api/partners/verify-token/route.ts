import { NextRequest, NextResponse } from 'next/server'
import { verifyInviteToken } from '@/lib/services/partner.service'

// POST /api/partners/verify-token — Verify JWT invite token without activating
// Body: { token }
// Returns partner info for the activation form
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'token is required' },
        { status: 400 }
      )
    }

    const result = await verifyInviteToken(token)

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.error || 'Invalid token' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        partnerId: result.decoded?.partnerId,
        email: result.decoded?.email,
        type: result.decoded?.type,
      },
    })
  } catch (error) {
    console.error('Error verifying partner invite token:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify invite token' },
      { status: 500 }
    )
  }
}
