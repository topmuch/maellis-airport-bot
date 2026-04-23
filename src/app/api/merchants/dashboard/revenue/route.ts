import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getMerchantRevenue } from '@/lib/services/merchant.service';

// ---------------------------------------------------------------------------
// GET /api/merchants/dashboard/revenue?merchantId=xxx&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: authResult.status || 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameter: merchantId' },
        { status: 400 },
      );
    }

    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // Validate date format if provided
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json(
        { success: false, error: 'startDate must be in YYYY-MM-DD format' },
        { status: 400 },
      );
    }
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json(
        { success: false, error: 'endDate must be in YYYY-MM-DD format' },
        { status: 400 },
      );
    }

    const revenue = await getMerchantRevenue(merchantId, startDate, endDate);

    return NextResponse.json({ success: true, data: revenue });
  } catch (error) {
    console.error('[GET /api/merchants/dashboard/revenue] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
