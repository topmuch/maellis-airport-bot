import { NextRequest, NextResponse } from 'next/server';
import { getMerchantDashboardStats } from '@/lib/services/merchant.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: merchantId } = await params;
    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'Merchant ID is required' },
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
