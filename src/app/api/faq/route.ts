import { NextRequest, NextResponse } from 'next/server'
import { getFAQs, createFAQ, getFAQStats } from '@/lib/services/faq.service'

// GET /api/faq — List FAQs with filters + stats
export async function GET(req: NextRequest) {
  try {
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
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
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
    const body = await req.json()
    const { category, question, answer, keywords, priority, airportCode } = body

    if (!category || !question?.fr || !answer?.fr) {
      return NextResponse.json({ success: false, error: 'Category, question.fr and answer.fr are required' }, { status: 400 })
    }

    const faq = await createFAQ({ airportCode, category, question, answer, keywords: keywords || [], priority })
    return NextResponse.json({ success: true, data: faq }, { status: 201 })
  } catch (error) {
    console.error('FAQ POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create FAQ' }, { status: 500 })
  }
}
