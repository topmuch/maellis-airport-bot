import { NextRequest, NextResponse } from 'next/server';
import { getMerchants } from '@/lib/services/merchant.service';

// ---------------------------------------------------------------------------
// GET /api/merchants?airport=DSS&category=duty_free&terminal=A&active=true
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const airportCode = searchParams.get('airport') || undefined;
    const category = searchParams.get('category') || undefined;
    const terminal = searchParams.get('terminal') || undefined;

    // active=true (default) → only active merchants; active=false → all
    const activeParam = searchParams.get('active');
    const activeOnly = activeParam === null ? true : activeParam === 'true';

    const merchants = await getMerchants(airportCode, category, terminal, activeOnly);

    return NextResponse.json({
      success: true,
      data: merchants,
      count: merchants.length,
    });
  } catch (error) {
    console.error('[GET /api/merchants] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
