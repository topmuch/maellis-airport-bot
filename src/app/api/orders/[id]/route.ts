import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// ─────────────────────────────────────────────
// Input validation schemas
// ─────────────────────────────────────────────

/**
 * Validate the dynamic [id] route parameter.
 * Accepts:
 *  - UUID format (cuid / uuid)
 *  - Order numbers matching ORD-YYYY-XXXXXX
 */
const orderIdSchema = z.string().min(1).max(50).regex(
  /^(ORD-\d{4}-\d{6}|[a-z0-9]{20,})$/i,
  'Invalid order ID or order number format'
);

// ---------------------------------------------------------------------------
// GET /api/orders/[id] — Get order by ID or order number
// If the id starts with "ORD-", it's treated as an order number.
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth(request);
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 });
  }

  try {
    const { id } = await params;

    // ── Validate ID format ──
    const parsed = orderIdSchema.safeParse(id);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid order ID format' },
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
