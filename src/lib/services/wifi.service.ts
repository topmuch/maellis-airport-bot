import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------

export type PlanType = 'free' | 'premium' | 'premium_plus';

export interface GenerateVoucherInput {
  phone?: string;
  planType: PlanType;
}

export interface ValidateVoucherResult {
  valid: boolean;
  voucher: Prisma.WiFiVoucherGetPayload<Record<string, never>> | null;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Plan configuration
// ---------------------------------------------------------------------------
const PLAN_CONFIG: Record<
  PlanType,
  { durationMinutes: number; bandwidthMbps: number; price: number }
> = {
  free: { durationMinutes: 60, bandwidthMbps: 10, price: 0 },
  premium: { durationMinutes: 240, bandwidthMbps: 50, price: 1500 },
  premium_plus: { durationMinutes: 480, bandwidthMbps: 100, price: 3000 },
};

// ---------------------------------------------------------------------------
// Helper: generate voucher code
// ---------------------------------------------------------------------------
function generateVoucherCode(): string {
  return `WIFI-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// 1. generateVoucher — Create a WiFi voucher
// ---------------------------------------------------------------------------
export async function generateVoucher(data: GenerateVoucherInput) {
  try {
    const config = PLAN_CONFIG[data.planType];

    const voucher = await db.wiFiVoucher.create({
      data: {
        voucherCode: generateVoucherCode(),
        phone: data.phone ?? null,
        planType: data.planType,
        durationMinutes: config.durationMinutes,
        bandwidthMbps: config.bandwidthMbps,
        price: config.price,
        currency: 'XOF',
        paymentStatus: config.price === 0 ? 'none' : 'pending',
        isActive: true,
      },
    });

    return voucher;
  } catch (error) {
    console.error('[wifi.service] generateVoucher error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 2. validateVoucher — Check if voucher is valid and not expired
// ---------------------------------------------------------------------------
export async function validateVoucher(
  code: string,
): Promise<ValidateVoucherResult> {
  try {
    const voucher = await db.wiFiVoucher.findUnique({
      where: { voucherCode: code },
    });

    if (!voucher) {
      return { valid: false, voucher: null, reason: 'Voucher not found' };
    }

    if (!voucher.isActive) {
      return { valid: false, voucher, reason: 'Voucher is deactivated' };
    }

    if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
      return { valid: false, voucher, reason: 'Voucher has expired' };
    }

    return { valid: true, voucher };
  } catch (error) {
    console.error('[wifi.service] validateVoucher error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 3. activateVoucher — Activate voucher (set activatedAt, expiresAt)
// ---------------------------------------------------------------------------
export async function activateVoucher(code: string) {
  try {
    // Validate first
    const validation = await validateVoucher(code);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid voucher');
    }

    const now = new Date();
    const voucher = validation.voucher!;

    // If already activated, return it as-is
    if (voucher.activatedAt) {
      return voucher;
    }

    // Calculate expiry based on plan duration
    const expiresAt = new Date(
      now.getTime() + voucher.durationMinutes * 60 * 1000,
    );

    const activated = await db.wiFiVoucher.update({
      where: { voucherCode: code },
      data: {
        activatedAt: now,
        expiresAt,
        paymentStatus: voucher.price === 0 ? 'none' : 'paid',
      },
    });

    return activated;
  } catch (error) {
    console.error('[wifi.service] activateVoucher error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 4. getVoucherByPhone — Get all vouchers for a phone number
// ---------------------------------------------------------------------------
export async function getVoucherByPhone(phone: string) {
  try {
    const vouchers = await db.wiFiVoucher.findMany({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });

    return vouchers;
  } catch (error) {
    console.error('[wifi.service] getVoucherByPhone error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 5. getWifiStats — Admin stats for WiFi vouchers
// ---------------------------------------------------------------------------
export async function getWifiStats(airportCode: string) {
  try {
    const where = { airportCode: airportCode.toUpperCase() };

    const [
      total,
      active,
      activated,
      expired,
      revenue,
      planBreakdown,
    ] = await Promise.all([
      db.wiFiVoucher.count({ where }),
      db.wiFiVoucher.count({ where: { ...where, isActive: true } }),
      db.wiFiVoucher.count({ where: { ...where, activatedAt: { not: null } } }),
      db.wiFiVoucher.count({
        where: {
          ...where,
          expiresAt: { not: null, lt: new Date() },
        },
      }),
      db.wiFiVoucher.aggregate({
        _sum: { price: true },
        where: { ...where, paymentStatus: 'paid' },
      }),
      db.wiFiVoucher.groupBy({
        by: ['planType'],
        where,
        _count: { planType: true },
      }),
    ]);

    return {
      totalVouchers: total,
      activeVouchers: active,
      activatedVouchers: activated,
      expiredVouchers: expired,
      totalRevenue: revenue._sum.price ?? 0,
      currency: 'XOF',
      planBreakdown: planBreakdown.map((p) => ({
        planType: p.planType,
        count: p._count.planType,
        config: PLAN_CONFIG[p.planType as PlanType],
      })),
    };
  } catch (error) {
    console.error('[wifi.service] getWifiStats error:', error);
    throw error;
  }
}
