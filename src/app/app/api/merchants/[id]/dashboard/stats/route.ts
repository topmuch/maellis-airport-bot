import { NextRequest, NextResponse } from 'next/server';
import { getMerchantDashboardStats } from '@/lib/services/merchant.service';
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

    const stats = await getMerchantDashboardStats(merchantId);

    if (!stats) {
      return NextResponse.json(
        { success: false, error: 'Merchant not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('[GET /api/merchants/:id/dashboard/stats] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
