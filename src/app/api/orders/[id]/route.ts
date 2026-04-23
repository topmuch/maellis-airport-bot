import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ---------------------------------------------------------------------------
// GET /api/orders/[id] — Get order by ID or order number
// If the id starts with "ORD-", it's treated as an order number.
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Order ID or order number is required' },
        { status: 400 },
      );
    }

    // If the id looks like an order number (ORD-YYYY-XXXXXX), search by orderNumber
    const whereClause = id.startsWith('ORD-')
      ? { orderNumber: id }
      : { id };

    const order = await db.order.findFirst({
      where: whereClause,
      include: {
        merchant: {
          select: { id: true, name: true, logo: true, terminal: true },
        },
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error(`[GET /api/orders/:id] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
