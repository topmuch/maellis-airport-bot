import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════
// Health & Pharmacy Service — Smartly V1.5
// Pharmacie & Santé Express — Commande médicaments livraison porte
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PharmacyOrderItem {
  name: string;
  quantity: number;
  price: number;
  productId?: string;
}

export interface CreatePharmacyOrderInput {
  airportCode?: string;
  customerName: string;
  customerPhone: string;
  flightNumber?: string;
  gate?: string;
  urgency?: 'normal' | 'urgent' | 'critical';
  items: PharmacyOrderItem[];
}

// ---------------------------------------------------------------------------
// 1. searchProducts — Search health products in marketplace
// ---------------------------------------------------------------------------
export async function searchProducts(query: string, airportCode: string = 'DSS') {
  try {
    const products = await db.product.findMany({
      where: {
        airportCode: airportCode.toUpperCase(),
        isAvailable: true,
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
          { category: { contains: query } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 20,
    });

    // Also search specifically in health category
    const healthProducts = await db.product.findMany({
      where: {
        merchant: {
          airportCode: airportCode.toUpperCase(),
          category: 'pharmacy',
          isActive: true,
        },
        isAvailable: true,
      },
      orderBy: { name: 'asc' },
      take: 20,
    });

    // Deduplicate by ID
    const seen = new Set<string>();
    const allProducts = [...products, ...healthProducts].filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    return allProducts;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[health-pharmacy.service] searchProducts error:', error);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 2. getPharmacyMerchants — Get pharmacy merchants
// ---------------------------------------------------------------------------
export async function getPharmacyMerchants(airportCode: string = 'DSS') {
  try {
    const merchants = await db.merchant.findMany({
      where: {
        airportCode: airportCode.toUpperCase(),
        category: 'pharmacy',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        phone: true,
        email: true,
        terminal: true,
        gate: true,
        openingHours: true,
        averageRating: true,
        reviewsCount: true,
      },
      orderBy: { name: 'asc' },
    });

    return merchants;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[health-pharmacy.service] getPharmacyMerchants error:', error);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 3. createPharmacyOrder — Create a pharmacy delivery order
// ---------------------------------------------------------------------------
export async function createPharmacyOrder(data: CreatePharmacyOrderInput) {
  try {
    const {
      airportCode = 'DSS',
      customerName,
      customerPhone,
      flightNumber,
      gate,
      urgency = 'normal',
      items,
    } = data;

    // Validate items
    if (!items || items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Calculate delivery fee based on urgency
    const deliveryFeeMap = { normal: 0, urgent: 500, critical: 1000 };
    const estimatedMinutesMap = { normal: 15, urgent: 10, critical: 5 };
    const deliveryFee = deliveryFeeMap[urgency] || 0;
    const estimatedMinutes = estimatedMinutesMap[urgency] || 15;

    const total = subtotal + deliveryFee;

    // Generate order ref
    const orderRef = `PH-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Find a pharmacy merchant to assign
    const pharmacy = await db.merchant.findFirst({
      where: {
        airportCode: airportCode.toUpperCase(),
        category: 'pharmacy',
        isActive: true,
      },
      select: { id: true, name: true },
    });

    const order = await db.pharmacyOrder.create({
      data: {
        airportCode: airportCode.toUpperCase(),
        customerName,
        customerPhone,
        flightNumber: flightNumber ?? null,
        gate: gate ?? null,
        urgency,
        items: JSON.stringify(items),
        subtotal,
        deliveryFee,
        total,
        currency: 'XOF',
        estimatedMinutes,
        orderRef,
        pharmacyId: pharmacy?.id ?? null,
        pharmacyName: pharmacy?.name ?? null,
        status: 'pending',
      },
    });

    return order;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[health-pharmacy.service] createPharmacyOrder error:', error);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 4. getPharmacyOrders — List pharmacy orders
// ---------------------------------------------------------------------------
export async function getPharmacyOrders(phone?: string, status?: string) {
  try {
    const where: Prisma.PharmacyOrderWhereInput = {};

    if (phone) {
      where.customerPhone = phone;
    }
    if (status) {
      where.status = status;
    }

    const orders = await db.pharmacyOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Parse items JSON
    return orders.map(order => ({
      ...order,
      items: JSON.parse(order.items),
    }));
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[health-pharmacy.service] getPharmacyOrders error:', error);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 5. updateOrderStatus — Update pharmacy order status
// ---------------------------------------------------------------------------
export async function updateOrderStatus(id: string, status: string) {
  try {
    const existing = await db.pharmacyOrder.findUnique({ where: { id } });
    if (!existing) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[health-pharmacy.service] Order not found: ${id}`);
      }
      return null;
    }

    const updated = await db.pharmacyOrder.update({
      where: { id },
      data: { status },
    });

    return updated;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[health-pharmacy.service] updateOrderStatus error:', error);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 6. getHealthStats — Admin dashboard stats
// ---------------------------------------------------------------------------
export async function getHealthStats(airportCode: string = 'DSS') {
  try {
    const [totalOrders, statusBreakdown, urgencyBreakdown, totalRevenue] =
      await Promise.all([
        db.pharmacyOrder.count({}),
        db.pharmacyOrder.groupBy({ by: ['status'], _count: true }),
        db.pharmacyOrder.groupBy({ by: ['urgency'], _count: true }),
        db.pharmacyOrder.aggregate({
          _sum: { total: true },
          where: { paymentStatus: 'paid' },
        }),
      ]);

    return {
      totalOrders,
      statusBreakdown: Object.fromEntries(statusBreakdown.map(s => [s.status, s._count])),
      urgencyBreakdown: Object.fromEntries(urgencyBreakdown.map(u => [u.urgency, u._count])),
      totalRevenue: totalRevenue._sum.total || 0,
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[health-pharmacy.service] getHealthStats error:', error);
    }
    throw error;
  }
}
