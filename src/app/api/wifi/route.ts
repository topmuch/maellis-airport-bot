import { NextRequest, NextResponse } from 'next/server'
import {
  generateVoucher,
  validateVoucher,
  getVoucherByPhone,
  getWifiStats,
} from '@/lib/services/wifi.service'

// GET /api/wifi - Validate voucher, list vouchers by phone, or get stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const phone = searchParams.get('phone')
    const stats = searchParams.get('stats')

    // If code provided, validate the voucher
    if (code) {
      const result = await validateVoucher(code)
      return NextResponse.json({ success: true, data: result })
    }

    // If stats requested, return WiFi stats
    if (stats === 'true') {
      const airportCode = searchParams.get('airportCode') || 'DSS'
      const wifiStats = await getWifiStats(airportCode)
      return NextResponse.json({ success: true, data: wifiStats })
    }

    // If phone provided, list vouchers for that phone
    if (phone) {
      const vouchers = await getVoucherByPhone(phone)
      return NextResponse.json({ success: true, data: vouchers })
    }

    return NextResponse.json(
      { success: false, error: 'Provide code (validate), phone (list vouchers), or stats=true (get stats)' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in WiFi GET handler:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process WiFi request' },
      { status: 500 }
    )
  }
}

// POST /api/wifi - Generate a WiFi voucher
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { planType } = body

    if (!planType) {
      return NextResponse.json(
        { success: false, error: 'planType is required (free, premium, premium_plus)' },
        { status: 400 }
      )
    }

    const validPlans = ['free', 'premium', 'premium_plus']
    if (!validPlans.includes(planType)) {
      return NextResponse.json(
        { success: false, error: `planType must be one of: ${validPlans.join(', ')}` },
        { status: 400 }
      )
    }

    const voucher = await generateVoucher({
      phone: body.phone,
      planType,
    })

    return NextResponse.json({ success: true, data: voucher }, { status: 201 })
  } catch (error) {
    console.error('Error generating WiFi voucher:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate WiFi voucher' },
      { status: 500 }
    )
  }
}
