import { NextRequest, NextResponse } from 'next/server';
import { getAirportPayoutDashboard } from '@/lib/services/payout.service';

// ---------------------------------------------------------------------------
// GET /api/payouts/dashboard?airportCode=xxx
// Dashboard data for airport admin with payout analytics
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const airportCode = searchParams.get('airportCode');

    if (!airportCode) {
      return NextResponse.json(
        { success: false, error: 'airportCode is required (query param: airportCode)' },
        { status: 400 },
      );
    }

    // Validate airport code format (IATA: 3 uppercase letters)
    if (!/^[A-Za-z]{2,4}$/.test(airportCode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid airport code format (expected 2-4 letters)' },
        { status: 400 },
      );
    }

    const dashboard = await getAirportPayoutDashboard(airportCode);

    return NextResponse.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    console.error('[GET /api/payouts/dashboard] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
