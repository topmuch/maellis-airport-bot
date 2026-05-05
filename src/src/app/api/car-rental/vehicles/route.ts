import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getVehicles, createVehicle } from '@/lib/services/car-rental.service'
import { parseBody, ValidationError } from '@/lib/validate'

// GET /api/car-rental/vehicles — List vehicles with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const filters = {
      partnerId: searchParams.get('partnerId') || undefined,
      category: searchParams.get('category') || undefined,
      isAvailable: searchParams.get('isAvailable') !== null
        ? searchParams.get('isAvailable') === 'true'
        : undefined,
      pickupDate: searchParams.get('pickupDate') || undefined,
      dropoffDate: searchParams.get('dropoffDate') || undefined,
    }

    const vehicles = await getVehicles(filters)

    return NextResponse.json({ success: true, data: vehicles })
  } catch (error) {
    console.error('[car-rental] Error fetching vehicles:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vehicles' },
      { status: 500 }
    )
  }
}

// POST /api/car-rental/vehicles — Add vehicle (SUPERADMIN, AIRPORT_ADMIN)
export async function POST(request: NextRequest) {
  try {
    const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN')
    const authResult = await checkRole(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication required' },
        { status: authResult.status || 401 }
      )
    }

    const body = await parseBody(request)

    if (!body.partnerId || !body.category || !body.brand || !body.model || !body.pricePerDay) {
      return NextResponse.json(
        { success: false, error: 'partnerId, category, brand, model, and pricePerDay are required' },
        { status: 400 }
      )
    }

    const vehicle = await createVehicle(body)

    return NextResponse.json({ success: true, data: vehicle }, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    const message = error instanceof Error ? error.message : 'Failed to create vehicle'
    const statusCode = message.includes('not found') ? 404
      : message.includes('Validation failed') ? 400
      : 500
    console.error('[car-rental] Error creating vehicle:', error)
    return NextResponse.json({ success: false, error: message }, { status: statusCode })
  }
}
