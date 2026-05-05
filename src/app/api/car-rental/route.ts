import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getPartners, createPartner } from '@/lib/services/car-rental.service'
import { parseBody, ValidationError } from '@/lib/validate'

// GET /api/car-rental — List partners (SUPERADMIN, AIRPORT_ADMIN only)
export async function GET(request: NextRequest) {
  try {
    const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN')
    const authResult = await checkRole(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication required' },
        { status: authResult.status || 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    const partners = await getPartners(activeOnly)

    return NextResponse.json({ success: true, data: partners })
  } catch (error) {
    console.error('[car-rental] Error fetching partners:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch car rental partners' },
      { status: 500 }
    )
  }
}

// POST /api/car-rental — Create partner (SUPERADMIN only)
export async function POST(request: NextRequest) {
  try {
    const checkRole = requireRole('SUPERADMIN')
    const authResult = await checkRole(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication required' },
        { status: authResult.status || 401 }
      )
    }

    const body = await parseBody(request)

    if (!body.name || !body.terminal || !body.contactPhone) {
      return NextResponse.json(
        { success: false, error: 'name, terminal, and contactPhone are required' },
        { status: 400 }
      )
    }

    const partner = await createPartner(body)

    return NextResponse.json({ success: true, data: partner }, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    const message = error instanceof Error ? error.message : 'Failed to create car rental partner'
    const statusCode = message.includes('Validation failed') ? 400 : 500
    console.error('[car-rental] Error creating partner:', error)
    return NextResponse.json({ success: false, error: message }, { status: statusCode })
  }
}
