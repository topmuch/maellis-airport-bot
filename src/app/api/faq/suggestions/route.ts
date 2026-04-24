import { NextRequest, NextResponse } from 'next/server'
import { getSuggestions, approveSuggestion, rejectSuggestion } from '@/lib/services/faq.service'

// GET /api/faq/suggestions — List suggestions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const suggestions = await getSuggestions({
      airportCode: searchParams.get('airport') || 'DSS',
      status: searchParams.get('status') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
    })
    return NextResponse.json({ success: true, data: suggestions })
  } catch (error) {
    console.error('FAQ suggestions GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch suggestions' }, { status: 500 })
  }
}

// POST /api/faq/suggestions — Approve or reject a suggestion
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, action } = body

    if (!id || !action) {
      return NextResponse.json({ success: false, error: 'ID and action are required' }, { status: 400 })
    }

    if (action === 'approve') {
      const result = await approveSuggestion(id)
      return NextResponse.json({ success: true, data: result })
    } else if (action === 'reject') {
      const result = await rejectSuggestion(id)
      return NextResponse.json({ success: true, data: result })
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action. Use "approve" or "reject".' }, { status: 400 })
    }
  } catch (error) {
    console.error('FAQ suggestions POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to process suggestion' }, { status: 500 })
  }
}
