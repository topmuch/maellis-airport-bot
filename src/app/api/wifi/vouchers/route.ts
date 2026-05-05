import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/wifi/vouchers — List all WiFi vouchers (admin)
// Query params: page, limit, status (active/expired/all), phone, airportCode
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const status = searchParams.get('status') || 'all' // active, expired, all
    const phone = searchParams.get('phone') || undefined
    const airportCode = searchParams.get('airportCode') || undefined
    const planType = searchParams.get('planType') || undefined

    // Build where clause
    const where: Record<string, unknown> = {}

    if (airportCode) {
      where.airportCode = airportCode.toUpperCase()
    }

    if (phone) {
      where.phone = { contains: phone }
    }

    if (planType) {
      where.planType = planType
    }

    if (status === 'active') {
      where.isActive = true
    } else if (status === 'expired') {
      where.expiresAt = { not: null, lt: new Date() }
    } else if (status === 'activated') {
      where.activatedAt = { not: null }
    } else if (status === 'unused') {
      where.activatedAt = null
      where.isActive = true
    }

    // Fetch vouchers and total count in parallel
    const [vouchers, total] = await Promise.all([
      db.wiFiVoucher.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.wiFiVoucher.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        vouchers,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching WiFi vouchers:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch WiFi vouchers' },
      { status: 500 },
    )
  }
}
