import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { getLounges, createLounge } from '@/lib/services/lounge.service';

// ---------------------------------------------------------------------------
// GET /api/lounges?airport=DSS — Returns lounges for an airport
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const airportCode = searchParams.get('airport');

    if (!airportCode) {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameter: airport' },
        { status: 400 },
      );
    }

    // Validate airport code format (3-letter IATA)
    if (!/^[A-Za-z]{3}$/.test(airportCode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid airport code. Must be a 3-letter IATA code.' },
        { status: 400 },
      );
    }

    const lounges = await getLounges(airportCode);

    return NextResponse.json({
      success: true,
      data: lounges,
      count: lounges.length,
    });
  } catch (error) {
    console.error('[GET /api/lounges] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/lounges — Create a new lounge (admin only)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    // Authenticate and authorize
    const authResult = await requireAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: authResult.error || 'Unauthorized' }, { status: authResult.status || 401 });
    }
    if (!['superadmin', 'airport_admin'].includes(authResult.user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
 }

    const body = await request.json();

    // Validate required fields
    const requiredFields: string[] = ['airportCode', 'name', 'location', 'priceStandard'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
        },
        { status: 400 },
      );
    }

    // Validate airport code format
    if (!/^[A-Za-z]{3}$/.test(body.airportCode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid airport code. Must be a 3-letter IATA code.' },
        { status: 400 },
      );
    }

    // Validate price
    if (typeof body.priceStandard !== 'number' || body.priceStandard < 0) {
      return NextResponse.json(
        { success: false, error: 'priceStandard must be a non-negative number' },
        { status: 400 },
      );
    }

    if (body.priceBusiness !== undefined && (typeof body.priceBusiness !== 'number' || body.priceBusiness < 0)) {
      return NextResponse.json(
        { success: false, error: 'priceBusiness must be a non-negative number' },
        { status: 400 },
      );
    }

    const lounge = await createLounge({
      airportCode: body.airportCode,
      name: body.name,
      description: body.description,
      location: body.location,
      priceStandard: body.priceStandard,
      priceBusiness: body.priceBusiness,
      currency: body.currency,
      maxCapacity: body.maxCapacity,
      openingHours: body.openingHours,
      accessLevel: body.accessLevel,
      imageUrl: body.imageUrl,
    });

    return NextResponse.json(
      { success: true, data: lounge },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Auth errors
      if (error.message === 'Unauthorized' || error.message === 'Authentication required') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 },
        );
      }
      if (error.message === 'Forbidden' || error.message.includes('Insufficient permissions')) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 },
        );
      }
    }

    console.error('[POST /api/lounges] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
