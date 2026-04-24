import { NextRequest, NextResponse } from 'next/server';
import { processPayout } from '@/lib/services/payout.service';

// ---------------------------------------------------------------------------
// POST /api/payouts/[id]/pay — Process (mark as paid) a single payout
// Body: { adminId, reference?, notes? }
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payout ID is required' },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.adminId) {
      return NextResponse.json(
        { success: false, error: 'adminId is required' },
        { status: 400 },
      );
    }

    // Validate adminId format
    if (typeof body.adminId !== 'string' || body.adminId.length < 5) {
      return NextResponse.json(
        { success: false, error: 'Invalid adminId format' },
        { status: 400 },
      );
    }

    const payout = await processPayout(
      id,
      body.adminId,
      body.reference,
      body.notes,
    );

    return NextResponse.json({
      success: true,
      data: payout,
      message: 'Payout processed successfully',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      const message = error.message;

      if (message.includes('Payout not found')) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 404 },
        );
      }

      if (message.includes('Cannot process payout')) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 409 },
        );
      }
    }

    console.error('[POST /api/payouts/:id/pay] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
