import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getPartnerCommissions } from '@/lib/services/partner.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/partners/[id]/commissions?month=2026-01 — Partner commission report
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
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || undefined

    // Validate month format if provided
    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { success: false, error: 'month must be in YYYY-MM format' },
        { status: 400 }
      )
    }

    const commissions = await getPartnerCommissions(id, month)

    return NextResponse.json({
      success: true,
      data: commissions,
    })
  } catch (error: unknown) {
    console.error('Error fetching partner commissions:', error)

    const message = error instanceof Error ? error.message : 'Failed to fetch partner commissions'

    if (message === 'Partner not found') {
      return NextResponse.json({ success: false, error: message }, { status: 404 })
    }
    if (message.includes('Invalid month format')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch partner commissions' },
      { status: 500 }
    )
  }
}
