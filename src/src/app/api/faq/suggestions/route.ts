import { NextRequest, NextResponse } from 'next/server'
import { getSuggestions, approveSuggestion, rejectSuggestion } from '@/lib/services/faq.service'
import { requireRole } from '@/lib/auth'
import { parseBody, ValidationError } from '@/lib/validate'

// GET /api/faq/suggestions — List suggestions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const suggestions = await getSuggestions({
      airportCode: searchParams.get('airport') || 'DSS',
      status: searchParams.get('status') || undefined,
      limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 1)),
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
    const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(req)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const body = await parseBody(req)
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
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('FAQ suggestions POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to process suggestion' }, { status: 500 })
  }
}
