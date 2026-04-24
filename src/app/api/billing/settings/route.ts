import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import {
  getBillingSettings,
  updateBillingSettings,
} from '@/lib/services/billing.service'

// GET /api/billing/settings — Get billing settings (admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const settings = await getBillingSettings()

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error('Error fetching billing settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch billing settings' },
      { status: 500 }
    )
  }
}

// PUT /api/billing/settings — Update billing settings (admin only)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()

    const settings = await updateBillingSettings(body)

    return NextResponse.json({
      success: true,
      data: settings,
      message: 'Billing settings updated successfully',
    })
  } catch (error) {
    console.error('Error updating billing settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update billing settings' },
      { status: 500 }
    )
  }
}
