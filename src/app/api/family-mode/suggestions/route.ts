import { NextRequest, NextResponse } from 'next/server';
import { getFamilySuggestions } from '@/lib/services/family-mode.service';

// ---------------------------------------------------------------------------
// GET /api/family-mode/suggestions?airportCode=xxx&terminal=yyy
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const airportCode = searchParams.get('airportCode');
    const terminal = searchParams.get('terminal') || undefined;

    if (!airportCode) {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameter: airportCode' },
        { status: 400 },
      );
    }

    if (!/^[A-Za-z]{3}$/.test(airportCode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid airport code. Must be a 3-letter IATA code.' },
        { status: 400 },
      );
    }

    const result = await getFamilySuggestions(airportCode, terminal);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.suggestions,
      count: result.suggestions?.length ?? 0,
    });
  } catch (error) {
    console.error('[GET /api/family-mode/suggestions] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
