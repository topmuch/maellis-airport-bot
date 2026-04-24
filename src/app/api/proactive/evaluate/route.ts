import { NextRequest, NextResponse } from 'next/server';
import { evaluateFlightsForProactive } from '@/lib/services/proactive.service';
import { requireAuth } from '@/lib/auth';

// ---------------------------------------------------------------------------
// POST /api/proactive/evaluate?airportCode=DSS
// Evaluate flights for proactive message triggers
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const airportCode = searchParams.get('airportCode');

    if (!airportCode || typeof airportCode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'airportCode query parameter is required' },
        { status: 400 },
      );
    }

    const actions = await evaluateFlightsForProactive(airportCode);

    return NextResponse.json({
      success: true,
      data: actions,
    });
  } catch (error) {
    console.error('[POST /api/proactive/evaluate] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
