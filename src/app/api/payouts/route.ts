import { NextRequest, NextResponse } from 'next/server';
import { getPayouts } from '@/lib/services/payout.service';

// ---------------------------------------------------------------------------
// GET /api/payouts?merchantId=xxx&status=xxx&startDate=xxx&endDate=xxx
// List payouts with optional filters and aggregate stats
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId') || undefined;
    const status = searchParams.get('status') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // Validate status if provided
    if (status && !['pending', 'paid', 'failed'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status filter. Must be one of: pending, paid, failed' },
        { status: 400 },
      );
    }

    // Validate date formats if provided
    if (startDate && isNaN(Date.parse(startDate))) {
      return NextResponse.json(
        { success: false, error: 'Invalid startDate format' },
        { status: 400 },
      );
    }

    if (endDate && isNaN(Date.parse(endDate))) {
      return NextResponse.json(
        { success: false, error: 'Invalid endDate format' },
        { status: 400 },
      );
    }

    const result = await getPayouts(merchantId, status, startDate, endDate);

    return NextResponse.json({
      success: true,
      data: result.payouts,
      stats: result.stats,
    });
  } catch (error) {
    console.error('[GET /api/payouts] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
