import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { matchFAQ } from '@/lib/services/faq.service';

/**
 * GET /api/faq/test-match?q=...&airport=DSS
 *
 * Convenience endpoint to test FAQ matching without a full bot flow.
 * Accepts query parameter `q` for the question and optional `airport` for the airport code.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user.success) {
      return NextResponse.json(
        { success: false, error: user.error },
        { status: user.status },
      );
    }

    const { searchParams } = new URL(request.url);
    const question = searchParams.get('q');

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query parameter "q" is required. Example: /api/faq/test-match?q=Où+est+mon+bagage',
        },
        { status: 400 },
      );
    }

    const airportCode = searchParams.get('airport') || 'DSS';
    const startTime = Date.now();

    const result = await matchFAQ(question, airportCode);
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        question,
        airportCode,
        responseTimeMs: responseTime,
      },
    });
  } catch (error) {
    console.error('FAQ test-match error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to match FAQ' },
      { status: 500 },
    );
  }
}
