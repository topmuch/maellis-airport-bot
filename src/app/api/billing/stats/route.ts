import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getBillingStats } from '@/lib/services/billing.service'

// GET /api/billing/stats — Dashboard stats (admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const stats = await getBillingStats()

    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error('Error fetching billing stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch billing stats' },
      { status: 500 }
    )
  }
}
