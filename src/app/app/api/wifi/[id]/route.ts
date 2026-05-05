import { NextRequest, NextResponse } from 'next/server'
import { activateVoucher } from '@/lib/services/wifi.service'
import { requireRole } from '@/lib/auth'

// PATCH /api/wifi/[id] - Activate a WiFi voucher
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT')(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
  }

  try {
    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    const voucher = await activateVoucher(id)

    return NextResponse.json({ success: true, data: voucher })
  } catch (error) {
    console.error('Error activating WiFi voucher:', error)
    const message = error instanceof Error ? error.message : 'Failed to activate WiFi voucher'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
