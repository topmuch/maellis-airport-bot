import { NextRequest, NextResponse } from 'next/server'
import { activateVoucher } from '@/lib/services/wifi.service'

// PATCH /api/wifi/[id] - Activate a WiFi voucher
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
