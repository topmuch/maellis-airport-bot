import { NextRequest, NextResponse } from 'next/server'
import { updateFAQ, deleteFAQ, getFAQById } from '@/lib/services/faq.service'

// GET /api/faq/[id] — Get single FAQ
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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
    const { id } = await params
    const body = await req.json()
    const faq = await updateFAQ(id, body)
    return NextResponse.json({ success: true, data: faq })
  } catch (error) {
    console.error('FAQ PUT error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update FAQ' }, { status: 500 })
  }
}

// DELETE /api/faq/[id] — Delete FAQ
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deleteFAQ(id)
    return NextResponse.json({ success: true, message: 'FAQ deleted' })
  } catch (error) {
    console.error('FAQ DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete FAQ' }, { status: 500 })
  }
}
