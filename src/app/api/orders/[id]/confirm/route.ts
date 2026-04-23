import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatus } from '@/lib/services/merchant.service';

// ---------------------------------------------------------------------------
// PUT /api/orders/[id]/confirm — Confirm order
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

    const updatedOrder = await updateOrderStatus(id, 'confirmed');

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Order confirmed successfully',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Order not found') {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 },
        );
      }
      if (error.message.includes('Cannot transition') || error.message.includes('Invalid status')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 },
        );
      }
    }

    console.error(`[PUT /api/orders/:id/confirm] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
