import { NextRequest, NextResponse } from 'next/server';
import { getProactiveStats } from '@/lib/services/proactive.service';
import { requireAuth } from '@/lib/auth';

// ---------------------------------------------------------------------------
// GET /api/proactive/stats?airportCode=xxx
// Aggregate statistics for proactive messages
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const airportCode = searchParams.get('airportCode') || undefined;

    const stats = await getProactiveStats(airportCode);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[GET /api/proactive/stats] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
