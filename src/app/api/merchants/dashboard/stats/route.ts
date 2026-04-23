import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getMerchantDashboardStats } from '@/lib/services/merchant.service';

// ---------------------------------------------------------------------------
// GET /api/merchants/dashboard/stats?merchantId=xxx
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

    const stats = await getMerchantDashboardStats(merchantId);

    if (!stats) {
      return NextResponse.json(
        { success: false, error: 'Merchant not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('[GET /api/merchants/dashboard/stats] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
