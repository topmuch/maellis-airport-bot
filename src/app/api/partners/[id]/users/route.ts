import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getPartnerUsers } from '@/lib/services/partner.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/partners/[id]/users — List users for a partner
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const { id } = await params

    const users = await getPartnerUsers(id)

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length,
    })
  } catch (error: unknown) {
    console.error('Error fetching partner users:', error)

    const message = error instanceof Error ? error.message : 'Failed to fetch partner users'

    if (message === 'Partner not found') {
      return NextResponse.json({ success: false, error: message }, { status: 404 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch partner users' },
      { status: 500 }
    )
  }
}
