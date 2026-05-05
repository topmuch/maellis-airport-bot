import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireAuth } from '@/lib/auth'
import { getContacts, createContact } from '@/lib/services/emergency.service'
import { parseBody, ValidationError } from '@/lib/validate'

// GET /api/emergency/contacts?airport=DSS&category=medical
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const airportCode = searchParams.get('airport')
    const category = searchParams.get('category') || undefined

    if (!airportCode) {
      return NextResponse.json(
        { success: false, error: 'airport query parameter is required' },
        { status: 400 }
      )
    }

    const contacts = await getContacts(airportCode, category)

    return NextResponse.json({ success: true, data: contacts })
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error fetching emergency contacts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch emergency contacts' },
      { status: 500 }
    )
  }
}

// POST /api/emergency/contacts — Create contact (admin only)
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
    const { airportCode, category, name, phoneNumber, whatsappNum, email, isPrimary, notes } = body

    if (!airportCode || !category || !name || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'airportCode, category, name, and phoneNumber are required' },
        { status: 400 }
      )
    }

    const contact = await createContact({
      airportCode,
      category,
      name,
      phoneNumber,
      whatsappNum: whatsappNum || undefined,
      email: email || undefined,
      isPrimary: isPrimary || undefined,
      notes: notes || undefined,
    })

    return NextResponse.json({ success: true, data: contact }, { status: 201 })
  } catch (error: unknown) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error creating emergency contact:', error)

    const internalMessage = error instanceof Error ? error.message : ''

    if (internalMessage.startsWith('Invalid category')) {
      return NextResponse.json({ success: false, error: 'Invalid category' }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create emergency contact' },
      { status: 500 }
    )
  }
}
