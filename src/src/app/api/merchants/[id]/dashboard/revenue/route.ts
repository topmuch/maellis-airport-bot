import { NextRequest, NextResponse } from 'next/server';
import { getMerchantRevenue } from '@/lib/services/merchant.service';
import { requireRole } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const { id: merchantId } = await params;

    if (!merchantId || typeof merchantId !== 'string' || merchantId.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
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
    console.error('[GET /api/merchants/:id/dashboard/revenue] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
