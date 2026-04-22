import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/auth'
import { getProviders, createProvider } from '@/lib/services/transport.service'

// GET /api/transport/providers?airport=DSS&type=taxi
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const airportCode = searchParams.get('airport')
    const type = searchParams.get('type') ?? undefined

    if (!airportCode) {
      return NextResponse.json(
        { error: 'airport query parameter is required' },
        { status: 400 }
      )
    }

    const providers = await getProviders(airportCode, type)

    return NextResponse.json({ data: providers })
  } catch (error) {
    console.error('Error fetching transport providers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transport providers' },
      { status: 500 }
    )
  }
}

// POST /api/transport/providers — Create provider (admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()
    const { airportCode, name, type, baseFare, perKmRate, minFare, contacts, logoUrl } = body

    if (!airportCode || !name || !type || baseFare === undefined || perKmRate === undefined || minFare === undefined) {
      return NextResponse.json(
        { error: 'airportCode, name, type, baseFare, perKmRate, and minFare are required' },
        { status: 400 }
      )
    }

    const validTypes = ['taxi', 'vtc', 'shuttle', 'private']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    if (typeof baseFare !== 'number' || baseFare < 0) {
      return NextResponse.json(
        { error: 'baseFare must be a non-negative number' },
        { status: 400 }
      )
    }

    if (typeof perKmRate !== 'number' || perKmRate < 0) {
      return NextResponse.json(
        { error: 'perKmRate must be a non-negative number' },
        { status: 400 }
      )
    }

    if (typeof minFare !== 'number' || minFare < 0) {
      return NextResponse.json(
        { error: 'minFare must be a non-negative number' },
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
      contacts: typeof contacts === 'string' ? contacts : undefined,
      logoUrl: typeof logoUrl === 'string' ? logoUrl : undefined,
    })

    return NextResponse.json({ data: provider }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating transport provider:', error)

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'A provider with this name already exists for this airport' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create transport provider' },
      { status: 500 }
    )
  }
}
