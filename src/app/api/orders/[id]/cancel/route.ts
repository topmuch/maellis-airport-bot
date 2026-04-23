import { NextRequest, NextResponse } from 'next/server';
import { cancelOrder } from '@/lib/services/merchant.service';

// ---------------------------------------------------------------------------
// PUT /api/orders/[id]/cancel — Cancel order
// ---------------------------------------------------------------------------
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason as string | undefined;

    const updatedOrder = await cancelOrder(id, reason);

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Order cancelled successfully',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Order not found') {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 },
        );
      }
      if (
        error.message === 'Order is already cancelled' ||
        error.message === 'Cannot cancel a completed order'
      ) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 },
        );
      }
    }

    console.error(`[PUT /api/orders/:id/cancel] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
