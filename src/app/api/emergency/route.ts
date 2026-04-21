import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/emergency - List emergency alerts
export async function GET() {
  try {
    const alerts = await db.emergencyAlert.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: alerts })
  } catch (error) {
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
    const body = await request.json()
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
    const body = await request.json()
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
    console.error('Error updating emergency alert:', error)
    return NextResponse.json(
      { error: 'Failed to update emergency alert' },
      { status: 500 }
    )
  }
}
