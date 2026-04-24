import { NextRequest, NextResponse } from 'next/server';
import { evaluateFlightsForProactive } from '@/lib/services/proactive.service';

// ---------------------------------------------------------------------------
// POST /api/proactive/evaluate?airportCode=DSS
// Evaluate flights for proactive message triggers
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
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
