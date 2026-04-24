import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'
import { parseBody, ValidationError } from '@/lib/validate'

// GET /api/settings - List all settings
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 })
  }
  try {
    const settings = await db.setting.findMany({
      orderBy: { group: 'asc' },
    })

    return NextResponse.json({ data: settings })
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT /api/settings - Update a setting
export async function PUT(request: NextRequest) {
  const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN')
  const authResult = await checkRole(request)
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 })
  }
  try {
    const body = await parseBody(request)
    const { key, value } = body

    if (!key) {
      return NextResponse.json(
        { error: 'key is required' },
        { status: 400 }
      )
    }

    const setting = await db.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })

    return NextResponse.json(setting)
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error updating setting:', error)
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    )
  }
}
