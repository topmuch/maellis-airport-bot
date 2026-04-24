import { NextRequest, NextResponse } from 'next/server';
import { getFeedbackAnalytics } from '@/lib/services/feedback.service';

// ---------------------------------------------------------------------------
// GET /api/feedback/analytics?airportCode=xxx
// Returns full analytics: avg rating, distributions, trends, low-score alerts
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const airportCode = searchParams.get('airportCode') || undefined;

    const analytics = await getFeedbackAnalytics(airportCode);

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('[GET /api/feedback/analytics] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
