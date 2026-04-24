import { NextRequest, NextResponse } from 'next/server'
import { matchFAQ } from '@/lib/services/faq.service'

// POST /api/faq/match — Match a user question against FAQs
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { question, airportCode } = body

    if (!question) {
      return NextResponse.json({ success: false, error: 'Question is required' }, { status: 400 })
    }

    const result = await matchFAQ(question, airportCode || 'DSS')
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('FAQ match error:', error)
    return NextResponse.json({ success: false, error: 'Failed to match FAQ' }, { status: 500 })
  }
}
