import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getProviderById, calculatePrice } from '@/lib/services/transport.service'
import { parseBody, ValidationError } from '@/lib/validate'

// POST /api/transport/calculate-price — Get pricing breakdown
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const body = await parseBody(request)

    const { providerId, distanceKm, passengers, pickupTime } = body

    if (!providerId || distanceKm === undefined) {
      return NextResponse.json(
        { success: false, error: 'providerId and distanceKm are required' },
        { status: 400 }
      )
    }

    if (typeof distanceKm !== 'number' || distanceKm < 0) {
      return NextResponse.json(
        { success: false, error: 'distanceKm must be a non-negative number' },
        { status: 400 }
      )
    }

    if (passengers !== undefined && (typeof passengers !== 'number' || passengers < 1 || !Number.isInteger(passengers))) {
      return NextResponse.json(
        { success: false, error: 'passengers must be a positive integer' },
        { status: 400 }
      )
    }

    if (pickupTime && !/^\d{2}:\d{2}$/.test(pickupTime)) {
      return NextResponse.json(
        { success: false, error: 'pickupTime must be in HH:mm format' },
        { status: 400 }
      )
    }

    // Fetch provider
    const provider = await getProviderById(providerId)
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Transport provider not found' },
        { status: 404 }
      )
    }

    const breakdown = calculatePrice(
      provider,
      distanceKm,
      passengers || 1,
      pickupTime || undefined
    )

    return NextResponse.json({
      success: true,
      data: breakdown,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Error calculating transport price:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
