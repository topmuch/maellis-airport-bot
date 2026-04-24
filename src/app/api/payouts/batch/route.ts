import { NextRequest, NextResponse } from 'next/server';
import { batchProcessPayouts } from '@/lib/services/payout.service';

// ---------------------------------------------------------------------------
// POST /api/payouts/batch — Process multiple payouts in a single transaction
// Body: { merchantId, adminId, payoutIds[], reference? }
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields: string[] = ['merchantId', 'adminId', 'payoutIds'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate merchantId
    if (typeof body.merchantId !== 'string' || body.merchantId.length < 5) {
      return NextResponse.json(
        { success: false, error: 'Invalid merchantId format' },
        { status: 400 },
      );
    }

    // Validate adminId
    if (typeof body.adminId !== 'string' || body.adminId.length < 5) {
      return NextResponse.json(
        { success: false, error: 'Invalid adminId format' },
        { status: 400 },
      );
    }

    // Validate payoutIds
    if (!Array.isArray(body.payoutIds) || body.payoutIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'payoutIds must be a non-empty array' },
        { status: 400 },
      );
    }

    // Validate each payoutId in the array
    for (const payoutId of body.payoutIds) {
      if (typeof payoutId !== 'string' || payoutId.length < 5) {
        return NextResponse.json(
          { success: false, error: `Invalid payoutId in array: ${payoutId}` },
          { status: 400 },
        );
      }
    }

    // Limit batch size to prevent abuse
    if (body.payoutIds.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Cannot batch more than 100 payouts at once' },
        { status: 400 },
      );
    }

    const result = await batchProcessPayouts(
      body.merchantId,
      body.adminId,
      body.payoutIds,
      body.reference,
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: `Batch processed: ${result.successCount} succeeded, ${result.failedCount} failed`,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      const message = error.message;

      if (message.includes('No payout IDs provided')) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 400 },
        );
      }
    }

    console.error('[POST /api/payouts/batch] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
