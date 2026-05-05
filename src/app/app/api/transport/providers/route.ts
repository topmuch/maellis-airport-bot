import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/auth'
import { getProviders, createProvider } from '@/lib/services/transport.service'
import { parseBody, ValidationError } from '@/lib/validate'

// GET /api/transport/providers?airport=DSS&type=taxi&active=true
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const { searchParams } = new URL(request.url)
    const airportCode = searchParams.get('airport')
    const type = searchParams.get('type') ?? undefined

    // active=true (default) → only active providers; active=false → all
    const activeParam = searchParams.get('active')
    const activeOnly = activeParam === null ? true : activeParam === 'true'

    if (!airportCode) {
      return NextResponse.json(
        { success: false, error: 'airport query parameter is required' },
        { status: 400 }
      )
    }

    const providers = await getProviders(airportCode, type, activeOnly)

    return NextResponse.json({ success: true, data: providers })
  } catch (error) {
    console.error('Error fetching transport providers:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transport providers' },
      { status: 500 }
    )
  }
}

// POST /api/transport/providers — Create provider (admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request)

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 401 }
      )
    }

    const body = await parseBody(request)

    const {
      airportCode,
      name,
      type,
      baseFare,
      perKmRate,
      minFare,
      nightSurcharge,
      contactPhone,
      contactEmail,
      whatsappNumber,
      contacts,
      serviceZones,
      logoUrl,
    } = body

    if (!airportCode || !name || !type || baseFare === undefined || perKmRate === undefined || minFare === undefined) {
      return NextResponse.json(
        { success: false, error: 'airportCode, name, type, baseFare, perKmRate, and minFare are required' },
        { status: 400 }
      )
    }

    const validTypes = ['taxi', 'vtc', 'shuttle', 'private']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate numeric fields
    if (typeof baseFare !== 'number' || baseFare < 0) {
      return NextResponse.json(
        { success: false, error: 'baseFare must be a non-negative number' },
        { status: 400 }
      )
    }

    if (typeof perKmRate !== 'number' || perKmRate < 0) {
      return NextResponse.json(
        { success: false, error: 'perKmRate must be a non-negative number' },
        { status: 400 }
      )
    }

    if (typeof minFare !== 'number' || minFare < 0) {
      return NextResponse.json(
        { success: false, error: 'minFare must be a non-negative number' },
        { status: 400 }
      )
    }

    if (nightSurcharge !== undefined && (typeof nightSurcharge !== 'number' || nightSurcharge < 0)) {
      return NextResponse.json(
        { success: false, error: 'nightSurcharge must be a non-negative number' },
        { status: 400 }
      )
    }

    const provider = await createProvider({
      airportCode,
      name,
      type,
      baseFare,
      perKmRate,
      minFare,
      nightSurcharge: typeof nightSurcharge === 'number' ? nightSurcharge : undefined,
      contactPhone: typeof contactPhone === 'string' ? contactPhone : undefined,
      contactEmail: typeof contactEmail === 'string' ? contactEmail : undefined,
      whatsappNumber: typeof whatsappNumber === 'string' ? whatsappNumber : undefined,
      contacts: typeof contacts === 'string' ? contacts : undefined,
      serviceZones: serviceZones !== undefined ? serviceZones : undefined,
      logoUrl: typeof logoUrl === 'string' ? logoUrl : undefined,
    })

    return NextResponse.json({ success: true, data: provider }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Error creating transport provider:', error)

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { success: false, error: 'A provider with this name already exists for this airport' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create transport provider' },
      { status: 500 }
    )
  }
}
