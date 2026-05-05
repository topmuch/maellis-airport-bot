import { NextRequest, NextResponse } from 'next/server'
import { updateFAQ, deleteFAQ, getFAQById } from '@/lib/services/faq.service'
import { requireRole } from '@/lib/auth'
import { parseBody, ValidationError } from '@/lib/validate'

// GET /api/faq/[id] — Get single FAQ
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    const faq = await getFAQById(id)
    if (!faq) {
      return NextResponse.json({ success: false, error: 'FAQ not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: faq })
  } catch (error) {
    console.error('FAQ GET by ID error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch FAQ' }, { status: 500 })
  }
}

// PUT /api/faq/[id] — Update FAQ
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(req)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    const body = await parseBody(req)
    const faq = await updateFAQ(id, body)
    return NextResponse.json({ success: true, data: faq })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('FAQ PUT error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update FAQ' }, { status: 500 })
  }
}

// DELETE /api/faq/[id] — Delete FAQ
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(req)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    await deleteFAQ(id)
    return NextResponse.json({ success: true, message: 'FAQ deleted' })
  } catch (error) {
    console.error('FAQ DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete FAQ' }, { status: 500 })
  }
}
