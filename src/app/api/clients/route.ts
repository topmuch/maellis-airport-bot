import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getClients, createClient } from '@/lib/services/billing.service'

// GET /api/clients — List clients (admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const result = await getClients({ search, page, limit })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}

// POST /api/clients — Create client (admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const { name, email, phone, company, taxId, address, currency, taxRate } = body as Record<string, any>

    // Basic validation
    if (!name || !email || !phone) {
      return NextResponse.json(
        { success: false, error: 'name, email, and phone are required' },
        { status: 400 }
      )
    }

    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'name must be a non-empty string' },
        { status: 400 }
      )
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'email must be a valid email address' },
        { status: 400 }
      )
    }

    if (typeof phone !== 'string' || phone.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'phone must be a non-empty string' },
        { status: 400 }
      )
    }

    const client = await createClient({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      company: company || undefined,
      taxId: taxId || undefined,
      address: address || '{}',
      currency: currency || 'XOF',
      taxRate: taxRate !== undefined ? Number(taxRate) : 0.18,
    })

    return NextResponse.json({ success: true, data: client }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating client:', error)

    const message = error instanceof Error ? error.message : 'Failed to create client'

    if (message.includes('already exists') || message.includes('Unique')) {
      return NextResponse.json(
        { success: false, error: 'A client with this email already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create client' },
      { status: 500 }
    )
  }
}
