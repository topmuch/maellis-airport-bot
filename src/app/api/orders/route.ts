import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createOrder, getOrders } from '@/lib/services/merchant.service';
import { requireAuth } from '@/lib/auth';
import { parseBody, ValidationError } from '@/lib/validate';

// ─────────────────────────────────────────────
// CSRF / Content-Type guard
// ─────────────────────────────────────────────

function hasJsonContentType(request: NextRequest): boolean {
  const ct = request.headers.get('content-type') ?? '';
  return ct.includes('application/json');
}

// ─────────────────────────────────────────────
// Input validation schemas
// ─────────────────────────────────────────────

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
  'completed',
  'cancelled',
  'refunded',
] as const;

const ORDER_TYPES = ['pickup', 'delivery_gate', 'reservation'] as const;

const orderItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  productName: z.string().min(1, 'Product name is required').max(200, 'Product name too long'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(99, 'Quantity cannot exceed 99'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative').max(9999999, 'Unit price exceeds limit'),
  notes: z.string().max(500, 'Item notes too long').optional(),
});

const createOrderSchema = z.object({
  merchantId: z.string().min(1, 'Merchant ID is required').max(100),
  customerName: z.string().min(1, 'Customer name is required').max(200, 'Name too long'),
  customerPhone: z
    .string()
    .min(1, 'Customer phone is required')
    .regex(/^\+?[\d\s-]{8,20}$/, 'Invalid phone format'),
  customerEmail: z
    .string()
    .email('Invalid email format')
    .max(200, 'Email too long')
    .optional()
    .or(z.literal('')),
  flightNumber: z.string().max(20, 'Flight number too long').optional(),
  gate: z.string().max(20, 'Gate too long').optional(),
  type: z.enum(ORDER_TYPES).optional(),
  items: z
    .array(orderItemSchema)
    .min(1, 'At least one item is required')
    .max(50, 'Cannot have more than 50 items'),
  scheduledTime: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/))
    .optional()
    .or(z.literal('')),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

const ordersQuerySchema = z.object({
  merchantId: z.string().max(100).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  customerPhone: z.string().max(20).optional(),
});

// ---------------------------------------------------------------------------
// POST /api/orders — Create order (no auth for bot)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 });
  }

  try {
    // ── Content-Type guard (CSRF protection) ──
    if (!hasJsonContentType(request)) {
      return NextResponse.json(
        { success: false, error: 'Content-Type must be application/json' },
        { status: 415 },
      );
    }

    const body = await parseBody(request);

    // ── Zod validation ──
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: firstError?.message ?? 'Validation failed',
          details: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const validated = parsed.data;

    const order = await createOrder({
      merchantId: validated.merchantId,
      customerName: validated.customerName,
      customerPhone: validated.customerPhone,
      customerEmail: validated.customerEmail || undefined,
      flightNumber: validated.flightNumber,
      gate: validated.gate,
      type: validated.type,
      items: validated.items,
      scheduledTime: validated.scheduledTime || undefined,
      notes: validated.notes,
    });

    return NextResponse.json(
      { success: true, data: order, message: 'Order created successfully' },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    if (error instanceof Error) {
      const message = error.message;
      if (
        message === 'Merchant not found' ||
        message === 'Product not found'
      ) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 404 },
        );
      }

      if (
        message === 'Merchant is not active' ||
        message === 'Product is not available' ||
        message === 'Order must have at least one item' ||
        message.includes('Invalid item')
      ) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 400 },
        );
      }

      if (message.includes('Insufficient stock')) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 409 },
        );
      }
    }

    console.error('[POST /api/orders] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/orders?merchantId=xxx&status=xxx&customerPhone=xxx
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 });
  }

  try {
    // ── Zod validation for query params ──
    const rawParams: Record<string, string> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });

    const parsed = ordersQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const { merchantId, status, customerPhone } = parsed.data;
    const orders = await getOrders(
      merchantId,
      status,
      customerPhone,
    );

    return NextResponse.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error('[GET /api/orders] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
