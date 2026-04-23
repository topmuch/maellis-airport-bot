import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getContacts, createContact } from '@/lib/services/emergency.service'

// GET /api/emergency/contacts?airport=DSS&category=medical
export async function GET(request: NextRequest) {
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
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()
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
    console.error('Error creating emergency contact:', error)

    const message = error instanceof Error ? error.message : 'Failed to create emergency contact'

    if (message.startsWith('Invalid category')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create emergency contact' },
      { status: 500 }
    )
  }
}
