import { NextRequest, NextResponse } from 'next/server';
import { getMerchants, createMerchant } from '@/lib/services/merchant.service';
import { requireAuth, requireRole } from '@/lib/auth';
import { parseBody, ValidationError } from '@/lib/validate'

// ---------------------------------------------------------------------------
// GET /api/merchants?airport=DSS&category=duty_free&terminal=A&active=true
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

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

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('[GET /api/merchants] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/merchants — Create merchant (dashboard use)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const body = await parseBody(request);

    // Validate required fields
    const requiredFields: string[] = ['airportCode', 'name', 'category', 'phone', 'email'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate airport code format (3-letter IATA)
    if (!/^[A-Za-z]{3}$/.test(body.airportCode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid airport code. Must be a 3-letter IATA code.' },
        { status: 400 },
      );
    }

    // Validate category
    const validCategories = ['duty_free', 'restaurant', 'cafe', 'souvenir', 'fashion', 'electronics', 'pharmacy', 'other'];
    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate email format
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 },
      );
    }

    // Validate commission rate if provided
    if (body.commissionRate !== undefined && (typeof body.commissionRate !== 'number' || body.commissionRate < 0 || body.commissionRate > 1)) {
      return NextResponse.json(
        { success: false, error: 'commissionRate must be a number between 0 and 1' },
        { status: 400 },
      );
    }

    const merchant = await createMerchant({
      airportCode: body.airportCode,
      name: body.name,
      description: body.description,
      logo: body.logo,
      category: body.category,
      terminal: body.terminal,
      gate: body.gate,
      location: body.location,
      phone: body.phone,
      email: body.email,
      openingHours: body.openingHours,
      commissionRate: body.commissionRate,
      paymentSchedule: body.paymentSchedule,
    });

    return NextResponse.json(
      { success: true, data: merchant, message: 'Merchant created successfully' },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint') || error.message.includes('unique')) {
        return NextResponse.json(
          { success: false, error: 'A merchant with this name already exists at this airport' },
          { status: 409 },
        );
      }
      if (error.message.includes('Invalid category')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 },
        );
      }
    }

    console.error('[POST /api/merchants] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
