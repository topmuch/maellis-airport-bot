import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'
import { parseBody, ValidationError } from '@/lib/validate'

// GET /api/emergency - List emergency alerts
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 })
    }

    const alerts = await db.emergencyAlert.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: alerts })
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error fetching emergency alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch emergency alerts' },
      { status: 500 }
    )
  }
}

// POST /api/emergency - Create new emergency alert
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 })
    }
    const body = await parseBody(request)
    const {
      userPhone,
      userName,
      alertType,
      location,
      description,
      severity,
    } = body

    if (!userPhone || !alertType || !description) {
      return NextResponse.json(
        { error: 'userPhone, alertType, and description are required' },
        { status: 400 }
      )
    }

    const alert = await db.emergencyAlert.create({
      data: {
        userPhone,
        userName: userName || null,
        alertType,
        location: location || null,
        description,
        severity: severity || 'medium',
      },
    })

    return NextResponse.json(alert, { status: 201 })
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error creating emergency alert:', error)
    return NextResponse.json(
      { error: 'Failed to create emergency alert' },
      { status: 500 }
    )
  }
}

// PATCH /api/emergency - Update emergency alert status
export async function PATCH(request: NextRequest) {
  try {
    const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT')
    const authResult = await checkRole(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 })
    }
    const body = await parseBody(request)
    const { id, status, assignedTo, resolution } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (assignedTo) updateData.assignedTo = assignedTo
    if (resolution) updateData.resolution = resolution

    const alert = await db.emergencyAlert.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(alert)
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error updating emergency alert:', error)
    return NextResponse.json(
      { error: 'Failed to update emergency alert' },
      { status: 500 }
    )
  }
}
