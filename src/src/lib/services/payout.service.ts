import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Wrap a raw internal error into a safe, user-facing message.
 * Logs the original error but never leaks internals (DB details, stack traces, etc.).
 */
function safeError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (process.env.NODE_ENV === 'development') {
    console.error(`[payout.service] ${context}:`, message);
  }
  return new Error(`An error occurred while ${context}. Please try again later.`);
}

/**
 * Validate that a date string is a valid ISO date.
 */
function isValidDateString(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Validate that a UUID-like identifier is a non-empty string.
 */
function isValidId(id: unknown): id is string {
  return typeof id === 'string' && id.trim().length > 0 && id.trim().length <= 200;
}

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------

export interface PayoutListResult {
  payouts: Prisma.MerchantPayoutGetPayload<{
    include: {
      Merchant: {
        select: { id: true; name: true; airportCode: true };
      };
    };
  }>[];
  stats: {
    totalPending: number;
    totalPaid: number;
    totalAmount: number;
    count: number;
  };
}

export interface MerchantPayoutSummary {
  merchantId: string;
  merchantName: string;
  airportCode: string;
  totalEarned: number;
  pendingAmount: number;
  paidAmount: number;
  payoutCount: number;
  pendingCount: number;
  paidCount: number;
  lastPayoutDate: Date | null;
  lastPaidAt: Date | null;
  commissionRate: number;
  paymentSchedule: string;
}

export interface BatchProcessResult {
  successCount: number;
  failedCount: number;
  results: {
    payoutId: string;
    success: boolean;
    error?: string;
  }[];
}

export interface AirportPayoutDashboard {
  airportCode: string;
  totalCommissions: number;
  pendingAmount: number;
  paidAmount: number;
  pendingCount: number;
  paidCount: number;
  totalCount: number;
  thisMonth: {
    total: number;
    count: number;
    pending: number;
    paid: number;
  };
  lastMonth: {
    total: number;
    count: number;
    pending: number;
    paid: number;
  };
  monthOverMonthChange: number; // percentage
  topMerchants: {
    merchantId: string;
    merchantName: string;
    category: string;
    totalCommissions: number;
    payoutCount: number;
    pendingAmount: number;
  }[];
}

// ---------------------------------------------------------------------------
// 1. createPayoutForOrder — Create commission payout when order is completed
// ---------------------------------------------------------------------------

export async function createPayoutForOrder(orderId: string) {
  try {
    if (!isValidId(orderId)) {
      throw new Error('Order ID is required');
    }

    // Find the order with its merchant (need commissionRate)
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        Merchant: {
          select: {
            id: true,
            name: true,
            commissionRate: true,
            airportCode: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.Merchant) {
      throw new Error('Order has no associated merchant');
    }

    // Validate order status is completed and payment is paid
    if (order.status !== 'completed') {
      throw new Error(
        `Cannot create payout: order status is "${order.status}", expected "completed"`,
      );
    }

    if (order.paymentStatus !== 'paid') {
      throw new Error(
        `Cannot create payout: payment status is "${order.paymentStatus}", expected "paid"`,
      );
    }

    // Idempotent check — return existing payout if one already exists for this order
    const existingPayout = await db.merchantPayout.findFirst({
      where: { orderId },
    });

    if (existingPayout) {
      return existingPayout;
    }

    // Calculate commission amount (validate inputs to prevent NaN/negative)
    const orderTotal = typeof order.total === 'number' && Number.isFinite(order.total) ? order.total : 0;
    const rate = typeof order.Merchant.commissionRate === 'number' && Number.isFinite(order.Merchant.commissionRate)
      ? order.Merchant.commissionRate
      : 0;
    const commissionAmount =
      Math.round(orderTotal * Math.min(1, Math.max(0, rate)) * 100) / 100;

    // Create the payout record
    const payout = await db.merchantPayout.create({
      data: {
        id: crypto.randomUUID(),
        merchantId: order.merchantId,
        orderId: order.id,
        orderTotal: order.total,
        commissionRate: order.Merchant.commissionRate,
        commissionAmount,
        currency: order.currency || 'XOF',
        status: 'pending',
        updatedAt: new Date(),
      },
      include: {
        Merchant: {
          select: { id: true, name: true, airportCode: true },
        },
      },
    });

    return payout;
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Order') || error.message.startsWith('Cannot'))) {
      throw error;
    }
    throw safeError(error, 'creating payout for order');
  }
}

// ---------------------------------------------------------------------------
// 2. getPayouts — List payouts with filters + aggregate stats
// ---------------------------------------------------------------------------

export async function getPayouts(
  merchantId?: string,
  status?: string,
  startDate?: string,
  endDate?: string,
): Promise<PayoutListResult> {
  try {
    // Validate date strings
    if (startDate && !isValidDateString(startDate)) {
      throw new Error('Invalid startDate format');
    }
    if (endDate && !isValidDateString(endDate)) {
      throw new Error('Invalid endDate format');
    }

    // Validate status enum
    const VALID_PAYOUT_STATUSES = ['pending', 'paid', 'cancelled'];
    if (status && !VALID_PAYOUT_STATUSES.includes(status)) {
      throw new Error(`Invalid status filter. Must be one of: ${VALID_PAYOUT_STATUSES.join(', ')}`);
    }

    // Build where clause
    const where: Prisma.MerchantPayoutWhereInput = {};

    if (merchantId && isValidId(merchantId)) {
      where.merchantId = merchantId;
    }
    if (status) {
      where.status = status;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Prisma.DateTimeNullableFilter).gte = new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (where.createdAt as Prisma.DateTimeNullableFilter).lte = end;
      }
    }

    // Fetch payouts with merchant info
    const payouts = await db.merchantPayout.findMany({
      where,
      include: {
        Merchant: {
          select: { id: true, name: true, airportCode: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute aggregate stats
    const allPayouts = await db.merchantPayout.findMany({
      where: merchantId ? { merchantId } : undefined,
      select: { status: true, commissionAmount: true },
    });

    let totalPending = 0;
    let totalPaid = 0;
    let totalAmount = 0;

    for (const p of allPayouts) {
      totalAmount += p.commissionAmount;
      if (p.status === 'pending') {
        totalPending += p.commissionAmount;
      } else if (p.status === 'paid') {
        totalPaid += p.commissionAmount;
      }
    }

    // Round to avoid floating point issues
    totalPending = Math.round(totalPending * 100) / 100;
    totalPaid = Math.round(totalPaid * 100) / 100;
    totalAmount = Math.round(totalAmount * 100) / 100;

    return {
      payouts,
      stats: {
        totalPending,
        totalPaid,
        totalAmount,
        count: payouts.length,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid')) {
      throw error;
    }
    throw safeError(error, 'retrieving payouts');
  }
}

// ---------------------------------------------------------------------------
// 3. getMerchantPayoutSummary — Aggregated summary for a single merchant
// ---------------------------------------------------------------------------

export async function getMerchantPayoutSummary(
  merchantId: string,
): Promise<MerchantPayoutSummary | null> {
  try {
    if (!isValidId(merchantId)) {
      throw new Error('Merchant ID is required');
    }

    // Validate merchant exists
    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        name: true,
        airportCode: true,
        commissionRate: true,
        paymentSchedule: true,
      },
    });

    if (!merchant) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[payout.service] getMerchantPayoutSummary: merchant not found`,
        );
      }
      return null;
    }

    // Aggregate all payouts for this merchant
    const overallAgg = await db.merchantPayout.aggregate({
      where: { merchantId },
      _sum: { commissionAmount: true },
      _count: true,
    });

    // Aggregate pending payouts
    const pendingAgg = await db.merchantPayout.aggregate({
      where: { merchantId, status: 'pending' },
      _sum: { commissionAmount: true },
      _count: true,
    });

    // Aggregate paid payouts
    const paidAgg = await db.merchantPayout.aggregate({
      where: { merchantId, status: 'paid' },
      _sum: { commissionAmount: true },
      _count: true,
    });

    // Get last payout date (any status) and last paid date
    const lastPayout = await db.merchantPayout.findFirst({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const lastPaidPayout = await db.merchantPayout.findFirst({
      where: { merchantId, status: 'paid' },
      orderBy: { paidAt: 'desc' },
      select: { paidAt: true },
    });

    return {
      merchantId: merchant.id,
      merchantName: merchant.name,
      airportCode: merchant.airportCode,
      totalEarned: Math.round((overallAgg._sum.commissionAmount ?? 0) * 100) / 100,
      pendingAmount: Math.round((pendingAgg._sum.commissionAmount ?? 0) * 100) / 100,
      paidAmount: Math.round((paidAgg._sum.commissionAmount ?? 0) * 100) / 100,
      payoutCount: overallAgg._count,
      pendingCount: pendingAgg._count,
      paidCount: paidAgg._count,
      lastPayoutDate: lastPayout?.createdAt ?? null,
      lastPaidAt: lastPaidPayout?.paidAt ?? null,
      commissionRate: merchant.commissionRate,
      paymentSchedule: merchant.paymentSchedule,
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Merchant')) {
      throw error;
    }
    throw safeError(error, 'retrieving merchant payout summary');
  }
}

// ---------------------------------------------------------------------------
// 4. processPayout — Mark a single payout as paid
// ---------------------------------------------------------------------------

export async function processPayout(
  payoutId: string,
  adminId: string,
  reference?: string,
  notes?: string,
) {
  try {
    if (!isValidId(payoutId)) {
      throw new Error('Payout ID is required');
    }
    if (!isValidId(adminId)) {
      throw new Error('Admin ID is required');
    }
    // Sanitize optional fields
    const safeReference = reference ? reference.trim().slice(0, 200) : undefined;
    const safeNotes = notes ? notes.trim().slice(0, 1000) : undefined;

    // Validate payout exists
    const payout = await db.merchantPayout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new Error('Payout not found');
    }

    if (payout.status !== 'pending') {
      throw new Error(
        `Cannot process payout: status is "${payout.status}", expected "pending"`,
      );
    }

    // Update the payout
    const updatedPayout = await db.merchantPayout.update({
      where: { id: payoutId },
      data: {
        status: 'paid',
        paidAt: new Date(),
        paidBy: adminId,
        reference: safeReference ?? null,
        notes: safeNotes ?? null,
      },
      include: {
        Merchant: {
          select: { id: true, name: true, airportCode: true },
        },
      },
    });

    return updatedPayout;
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Payout') || error.message.startsWith('Cannot') || error.message.startsWith('Admin'))) {
      throw error;
    }
    throw safeError(error, 'processing payout');
  }
}

// ---------------------------------------------------------------------------
// 5. batchProcessPayouts — Process multiple payouts in a single transaction
// ---------------------------------------------------------------------------

export async function batchProcessPayouts(
  merchantId: string,
  adminId: string,
  payoutIds: string[],
  reference?: string,
): Promise<BatchProcessResult> {
  try {
    if (!isValidId(merchantId)) {
      throw new Error('Merchant ID is required');
    }
    if (!isValidId(adminId)) {
      throw new Error('Admin ID is required');
    }
    if (!Array.isArray(payoutIds) || payoutIds.length === 0) {
      throw new Error('No payout IDs provided for batch processing');
    }
    if (payoutIds.length > 200) {
      throw new Error('Cannot batch process more than 200 payouts at once');
    }
    // Sanitize reference
    const safeReference = reference ? reference.trim().slice(0, 200) : undefined;

    // Pre-validate: fetch all payouts and check they exist and belong to this merchant
    const payouts = await db.merchantPayout.findMany({
      where: {
        id: { in: payoutIds },
      },
      select: {
        id: true,
        merchantId: true,
        status: true,
      },
    });

    const results: BatchProcessResult['results'] = [];
    let successCount = 0;
    let failedCount = 0;

    // Build a map for quick lookup
    const payoutMap = new Map(payouts.map((p) => [p.id, p]));

    // Validate each payout ID
    for (const payoutId of payoutIds) {
      const payout = payoutMap.get(payoutId);

      if (!payout) {
        results.push({ payoutId, success: false, error: 'Payout not found' });
        failedCount++;
        continue;
      }

      if (payout.merchantId !== merchantId) {
        results.push({
          payoutId,
          success: false,
          error: 'Payout does not belong to the specified merchant',
        });
        failedCount++;
        continue;
      }

      if (payout.status !== 'pending') {
        results.push({
          payoutId,
          success: false,
          error: `Payout status is "${payout.status}", expected "pending"`,
        });
        failedCount++;
        continue;
      }

      // Payout is valid, mark for processing
      results.push({ payoutId, success: true });
      successCount++;
    }

    // Get the IDs of payouts that passed validation
    const validPayoutIds = results
      .filter((r) => r.success)
      .map((r) => r.payoutId);

    if (validPayoutIds.length === 0) {
      return { successCount: 0, failedCount, results };
    }

    // Process all valid payouts in a single transaction
    await db.$transaction(async (tx) => {
      await tx.merchantPayout.updateMany({
        where: {
          id: { in: validPayoutIds },
          status: 'pending',
        },
        data: {
          status: 'paid',
          paidAt: new Date(),
          paidBy: adminId,
          reference: safeReference ?? null,
        },
      });
    });

    return { successCount, failedCount, results };
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Merchant') || error.message.startsWith('Admin') || error.message.startsWith('No ') || error.message.startsWith('Cannot'))) {
      throw error;
    }
    throw safeError(error, 'batch processing payouts');
  }
}

// ---------------------------------------------------------------------------
// 6. getAirportPayoutDashboard — Dashboard data for airport admin
// ---------------------------------------------------------------------------

export async function getAirportPayoutDashboard(
  airportCode: string,
): Promise<AirportPayoutDashboard | null> {
  try {
    // Validate airport code format (IATA: 3 uppercase letters)
    if (!airportCode || !/^[A-Za-z]{3}$/.test(airportCode.trim())) {
      throw new Error('Airport code must be a 3-letter IATA code');
    }

    const normalizedCode = airportCode.trim().toUpperCase();

    // Get all merchant IDs at this airport
    const merchants = await db.merchant.findMany({
      where: { airportCode: normalizedCode },
      select: {
        id: true,
        name: true,
        category: true,
        commissionRate: true,
      },
    });

    if (merchants.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[payout.service] getAirportPayoutDashboard: no merchants found at airport ${normalizedCode}`,
        );
      }
      return {
        airportCode: normalizedCode,
        totalCommissions: 0,
        pendingAmount: 0,
        paidAmount: 0,
        pendingCount: 0,
        paidCount: 0,
        totalCount: 0,
        thisMonth: { total: 0, count: 0, pending: 0, paid: 0 },
        lastMonth: { total: 0, count: 0, pending: 0, paid: 0 },
        monthOverMonthChange: 0,
        topMerchants: [],
      };
    }

    const merchantIds = merchants.map((m) => m.id);

    // Date ranges
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Overall aggregates for all merchants at this airport
    const overallAgg = await db.merchantPayout.aggregate({
      where: { merchantId: { in: merchantIds } },
      _sum: { commissionAmount: true },
      _count: true,
    });

    const pendingAgg = await db.merchantPayout.aggregate({
      where: {
        merchantId: { in: merchantIds },
        status: 'pending',
      },
      _sum: { commissionAmount: true },
      _count: true,
    });

    const paidAgg = await db.merchantPayout.aggregate({
      where: {
        merchantId: { in: merchantIds },
        status: 'paid',
      },
      _sum: { commissionAmount: true },
      _count: true,
    });

    // This month aggregates
    const thisMonthAgg = await db.merchantPayout.aggregate({
      where: {
        merchantId: { in: merchantIds },
        createdAt: { gte: thisMonthStart },
      },
      _sum: { commissionAmount: true },
      _count: true,
    });

    const thisMonthPendingAgg = await db.merchantPayout.aggregate({
      where: {
        merchantId: { in: merchantIds },
        status: 'pending',
        createdAt: { gte: thisMonthStart },
      },
      _sum: { commissionAmount: true },
      _count: true,
    });

    const thisMonthPaidAgg = await db.merchantPayout.aggregate({
      where: {
        merchantId: { in: merchantIds },
        status: 'paid',
        createdAt: { gte: thisMonthStart },
      },
      _sum: { commissionAmount: true },
      _count: true,
    });

    // Last month aggregates
    const lastMonthAgg = await db.merchantPayout.aggregate({
      where: {
        merchantId: { in: merchantIds },
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { commissionAmount: true },
      _count: true,
    });

    const lastMonthPendingAgg = await db.merchantPayout.aggregate({
      where: {
        merchantId: { in: merchantIds },
        status: 'pending',
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { commissionAmount: true },
      _count: true,
    });

    const lastMonthPaidAgg = await db.merchantPayout.aggregate({
      where: {
        merchantId: { in: merchantIds },
        status: 'paid',
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { commissionAmount: true },
      _count: true,
    });

    // Month-over-month change (percentage)
    const thisMonthTotal = thisMonthAgg._sum.commissionAmount ?? 0;
    const lastMonthTotal = lastMonthAgg._sum.commissionAmount ?? 0;
    const monthOverMonthChange =
      lastMonthTotal > 0
        ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 10000) / 100
        : thisMonthTotal > 0
          ? 100
          : 0;

    // Top 5 merchants by total commission
    const merchantCommissions = await db.merchantPayout.groupBy({
      by: ['merchantId'],
      where: { merchantId: { in: merchantIds } },
      _sum: { commissionAmount: true },
      _count: true,
      orderBy: { _sum: { commissionAmount: 'desc' } },
      take: 5,
    });

    // For each top merchant, also get pending amount
    const topMerchants = await Promise.all(
      merchantCommissions.map(async (mc) => {
        const merchant = merchants.find((m) => m.id === mc.merchantId);
        const pendingAgg = await db.merchantPayout.aggregate({
          where: {
            merchantId: mc.merchantId,
            status: 'pending',
          },
          _sum: { commissionAmount: true },
        });

        return {
          merchantId: mc.merchantId,
          merchantName: merchant?.name ?? 'Unknown',
          category: merchant?.category ?? 'other',
          totalCommissions: Math.round((mc._sum.commissionAmount ?? 0) * 100) / 100,
          payoutCount: mc._count,
          pendingAmount: Math.round((pendingAgg._sum.commissionAmount ?? 0) * 100) / 100,
        };
      }),
    );

    return {
      airportCode: normalizedCode,
      totalCommissions: Math.round((overallAgg._sum.commissionAmount ?? 0) * 100) / 100,
      pendingAmount: Math.round((pendingAgg._sum.commissionAmount ?? 0) * 100) / 100,
      paidAmount: Math.round((paidAgg._sum.commissionAmount ?? 0) * 100) / 100,
      pendingCount: pendingAgg._count,
      paidCount: paidAgg._count,
      totalCount: overallAgg._count,
      thisMonth: {
        total: Math.round((thisMonthAgg._sum.commissionAmount ?? 0) * 100) / 100,
        count: thisMonthAgg._count,
        pending: Math.round((thisMonthPendingAgg._sum.commissionAmount ?? 0) * 100) / 100,
        paid: Math.round((thisMonthPaidAgg._sum.commissionAmount ?? 0) * 100) / 100,
      },
      lastMonth: {
        total: Math.round((lastMonthAgg._sum.commissionAmount ?? 0) * 100) / 100,
        count: lastMonthAgg._count,
        pending: Math.round((lastMonthPendingAgg._sum.commissionAmount ?? 0) * 100) / 100,
        paid: Math.round((lastMonthPaidAgg._sum.commissionAmount ?? 0) * 100) / 100,
      },
      monthOverMonthChange,
      topMerchants,
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Airport')) {
      throw error;
    }
    throw safeError(error, 'retrieving airport payout dashboard');
  }
}
