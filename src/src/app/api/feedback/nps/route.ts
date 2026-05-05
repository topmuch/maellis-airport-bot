import { NextRequest, NextResponse } from 'next/server';
import { getNPSScore } from '@/lib/services/feedback.service';
import { requireRole } from '@/lib/auth';

// ---------------------------------------------------------------------------
// GET /api/feedback/nps?airportCode=xxx&startDate=xxx&endDate=xxx
// Returns NPS score + breakdown
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);

    const airportCode = searchParams.get('airportCode') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const result = await getNPSScore(airportCode, startDate, endDate);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[GET /api/feedback/nps] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
