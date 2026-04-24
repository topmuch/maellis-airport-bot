import { NextRequest, NextResponse } from 'next/server';
import { getRecentAlerts } from '@/lib/services/feedback.service';

// ---------------------------------------------------------------------------
// GET /api/feedback/alerts?airportCode=xxx
// Returns feedback with rating <= 2 in the last 24 hours
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const airportCode = searchParams.get('airportCode') || undefined;

    const result = await getRecentAlerts(airportCode);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[GET /api/feedback/alerts] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
