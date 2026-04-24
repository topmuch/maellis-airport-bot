import { NextRequest, NextResponse } from 'next/server'
import { getFAQs, createFAQ, getFAQStats } from '@/lib/services/faq.service'
import { requireAuth, requireRole } from '@/lib/auth'
import { parseBody, ValidationError } from '@/lib/validate'

// GET /api/faq — List FAQs with filters + stats
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')

    if (type === 'stats') {
      const airportCode = searchParams.get('airport') || 'DSS'
      const stats = await getFAQStats(airportCode)
      return NextResponse.json({ success: true, data: stats })
    }

    const faqs = await getFAQs({
      airportCode: searchParams.get('airport') || 'DSS',
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      isActive: searchParams.get('active') === 'true' ? true : searchParams.get('active') === 'false' ? false : undefined,
      page: Math.max(1, parseInt(searchParams.get('page') || '1') || 1),
      limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 1)),
    })
    return NextResponse.json({ success: true, data: faqs })
  } catch (error) {
    console.error('FAQ GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch FAQs' }, { status: 500 })
  }
}

// POST /api/faq — Create new FAQ
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(req)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const body = await parseBody(req)
    const { category, question, answer, keywords, priority, airportCode } = body

    if (!category || !question?.fr || !answer?.fr) {
      return NextResponse.json({ success: false, error: 'Category, question.fr and answer.fr are required' }, { status: 400 })
    }

    const faq = await createFAQ({ airportCode, category, question, answer, keywords: keywords || [], priority })
    return NextResponse.json({ success: true, data: faq }, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('FAQ POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create FAQ' }, { status: 500 })
  }
}
