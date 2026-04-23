import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------

export interface CreateMerchantInput {
  airportCode: string;
  name: string;
  description?: string;
  logo?: string;
  category: string;
  terminal?: string;
  gate?: string;
  location?: string;
  phone: string;
  email: string;
  openingHours?: string;
  commissionRate?: number;
  paymentSchedule?: string;
}

export interface UpdateMerchantInput {
  name?: string;
  description?: string;
  logo?: string;
  category?: string;
  terminal?: string;
  gate?: string;
  location?: string;
  phone?: string;
  email?: string;
  openingHours?: string;
  isActive?: boolean;
  commissionRate?: number;
  paymentSchedule?: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  category: string;
  price: number;
  currency?: string;
  images?: string;
  stock?: number;
  isAvailable?: boolean;
  isPreOrder?: boolean;
  tags?: string;
  discountPercent?: number;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  currency?: string;
  images?: string;
  stock?: number;
  isAvailable?: boolean;
  isPreOrder?: boolean;
  tags?: string;
  discountPercent?: number;
}

export interface CreateOrderInput {
  merchantId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  flightNumber?: string;
  gate?: string;
  type?: 'pickup' | 'delivery_gate' | 'reservation';
  items: {
    productId: string;
    productName: string;
    productImage?: string;
    quantity: number;
    customizations?: string;
  }[];
  scheduledTime?: string;
  notes?: string;
}

export interface CreateReviewInput {
  merchantId: string;
  customerName: string;
  customerPhone: string;
  orderId?: string;
  rating: number;
  comment?: string;
  images?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAX_RATE = 0.18; // 18% TVA Senegal
const DELIVERY_GATE_FEE = 500; // FCFA

const VALID_MERCHANT_CATEGORIES = [
  'duty_free',
  'restaurant',
  'cafe',
  'souvenir',
  'fashion',
  'electronics',
  'pharmacy',
  'other',
];

const VALID_ORDER_TYPES = ['pickup', 'delivery_gate', 'reservation'];
const VALID_ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled',
];

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed'],
  completed: [],
  cancelled: [],
};

// ---------------------------------------------------------------------------
// 1. getMerchants — List merchants with filters
// ---------------------------------------------------------------------------
export async function getMerchants(
  airportCode?: string,
  category?: string,
  terminal?: string,
  activeOnly: boolean = true,
) {
  try {
    const where: Prisma.MerchantWhereInput = {};

    if (airportCode) {
      where.airportCode = airportCode.toUpperCase();
    }
    if (category) {
      where.category = category;
    }
    if (terminal) {
      where.terminal = terminal;
    }
    if (activeOnly) {
      where.isActive = true;
    }

    const merchants = await db.merchant.findMany({
      where,
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return merchants;
  } catch (error) {
    console.error('[merchant.service] getMerchants error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 2. getMerchantById — Single merchant with product count
// ---------------------------------------------------------------------------
export async function getMerchantById(id: string) {
  try {
    const merchant = await db.merchant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, orders: true, reviews: true },
        },
      },
    });

    if (!merchant) {
      console.error(`[merchant.service] Merchant not found: ${id}`);
      return null;
    }

    return merchant;
  } catch (error) {
    console.error('[merchant.service] getMerchantById error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 3. createMerchant — Create, validate unique [airportCode, name]
// ---------------------------------------------------------------------------
export async function createMerchant(data: CreateMerchantInput) {
  try {
    // Validate category
    if (!VALID_MERCHANT_CATEGORIES.includes(data.category)) {
      throw new Error(
        `Invalid category. Must be one of: ${VALID_MERCHANT_CATEGORIES.join(', ')}`,
      );
    }

    const merchant = await db.merchant.create({
      data: {
        airportCode: data.airportCode.toUpperCase(),
        name: data.name,
        description: data.description ?? null,
        logo: data.logo ?? null,
        category: data.category,
        terminal: data.terminal ?? '',
        gate: data.gate ?? null,
        location: data.location ??
          JSON.stringify({ terminal: data.terminal ?? '', gate: data.gate ?? '' }),
        phone: data.phone,
        email: data.email,
        openingHours: data.openingHours ?? '{}',
        commissionRate: data.commissionRate ?? 0.10,
        paymentSchedule: data.paymentSchedule ?? 'weekly',
      },
    });

    return merchant;
  } catch (error) {
    console.error('[merchant.service] createMerchant error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 4. updateMerchant — Partial update
// ---------------------------------------------------------------------------
export async function updateMerchant(id: string, data: UpdateMerchantInput) {
  try {
    const existing = await db.merchant.findUnique({ where: { id } });
    if (!existing) {
      console.error(`[merchant.service] updateMerchant: merchant not found: ${id}`);
      return null;
    }

    // Validate category if provided
    if (data.category && !VALID_MERCHANT_CATEGORIES.includes(data.category)) {
      throw new Error(
        `Invalid category. Must be one of: ${VALID_MERCHANT_CATEGORIES.join(', ')}`,
      );
    }

    const merchant = await db.merchant.update({
      where: { id },
      data,
    });

    return merchant;
  } catch (error) {
    console.error('[merchant.service] updateMerchant error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 5. deleteMerchant — Soft delete (isActive=false)
// ---------------------------------------------------------------------------
export async function deleteMerchant(id: string) {
  try {
    const existing = await db.merchant.findUnique({ where: { id } });
    if (!existing) {
      console.error(`[merchant.service] deleteMerchant: merchant not found: ${id}`);
      return null;
    }

    const merchant = await db.merchant.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true, deletedId: id, merchant };
  } catch (error) {
    console.error('[merchant.service] deleteMerchant error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 6. verifyMerchant — Set isVerified=true
// ---------------------------------------------------------------------------
export async function verifyMerchant(id: string) {
  try {
    const existing = await db.merchant.findUnique({ where: { id } });
    if (!existing) {
      console.error(`[merchant.service] verifyMerchant: merchant not found: ${id}`);
      return null;
    }

    const merchant = await db.merchant.update({
      where: { id },
      data: { isVerified: true },
    });

    return merchant;
  } catch (error) {
    console.error('[merchant.service] verifyMerchant error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 7. getMerchantDashboardStats
// ---------------------------------------------------------------------------
export async function getMerchantDashboardStats(merchantId: string) {
  try {
    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
      include: {
        products: {
          select: { id: true, name: true, totalSold: true },
          orderBy: { name: 'asc' },
          take: 5,
        },
        _count: {
          select: {
            orders: {
              where: { status: 'pending' },
            },
            products: true,
          },
        },
      },
    });

    if (!merchant) {
      console.error(`[merchant.service] getMerchantDashboardStats: merchant not found: ${merchantId}`);
      return null;
    }

    const pendingOrders = await db.order.count({
      where: { merchantId, status: 'pending' },
    });

    // Get top selling products
    const topProducts = await db.product.findMany({
      where: { merchantId },
      orderBy: { name: 'asc' },
      take: 5,
      select: { id: true, name: true, price: true, stock: true },
    });

    return {
      totalSales: merchant.totalSales,
      totalOrders: merchant.totalOrders,
      pendingOrders,
      productCount: merchant._count.products,
      averageRating: merchant.averageRating,
      reviewsCount: merchant.reviewsCount,
      topProducts,
    };
  } catch (error) {
    console.error('[merchant.service] getMerchantDashboardStats error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 8. getMerchantRevenue
// ---------------------------------------------------------------------------
export async function getMerchantRevenue(
  merchantId: string,
  startDate?: string,
  endDate?: string,
) {
  try {
    const where: Prisma.OrderWhereInput = {
      merchantId,
      status: 'completed',
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Prisma.DateTimeNullableFilter).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Prisma.DateTimeNullableFilter).lte = new Date(endDate);
      }
    }

    const revenueData = await db.order.aggregate({
      where,
      _sum: { total: true, subtotal: true, tax: true, deliveryFee: true },
      _count: true,
    });

    const orders = await db.order.findMany({
      where,
      select: { id: true, orderNumber: true, total: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalRevenue: revenueData._sum.total ?? 0,
      totalSubtotal: revenueData._sum.subtotal ?? 0,
      totalTax: revenueData._sum.tax ?? 0,
      totalDeliveryFee: revenueData._sum.deliveryFee ?? 0,
      orderCount: revenueData._count,
      orders,
    };
  } catch (error) {
    console.error('[merchant.service] getMerchantRevenue error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 9. getProducts — Search/filter products
// ---------------------------------------------------------------------------
export async function getProducts(
  merchantId?: string,
  category?: string,
  search?: string,
  isAvailable?: boolean,
  tags?: string,
) {
  try {
    const where: Prisma.ProductWhereInput = {};

    if (merchantId) {
      where.merchantId = merchantId;
    }
    if (category) {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable;
    }
    if (tags) {
      // Tags stored as JSON string — we do a simple contains match
      where.tags = { contains: tags };
    }

    const products = await db.product.findMany({
      where,
      include: {
        merchant: {
          select: { id: true, name: true, logo: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products;
  } catch (error) {
    console.error('[merchant.service] getProducts error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 10. getProductById — With merchant info
// ---------------------------------------------------------------------------
export async function getProductById(id: string) {
  try {
    const product = await db.product.findUnique({
      where: { id },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            logo: true,
            category: true,
            terminal: true,
            averageRating: true,
            reviewsCount: true,
          },
        },
      },
    });

    if (!product) {
      console.error(`[merchant.service] getProductById: product not found: ${id}`);
      return null;
    }

    return product;
  } catch (error) {
    console.error('[merchant.service] getProductById error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 11. createProduct — Create product for merchant
// ---------------------------------------------------------------------------
export async function createProduct(merchantId: string, data: CreateProductInput) {
  try {
    // Verify merchant exists
    const merchant = await db.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) {
      throw new Error('Merchant not found');
    }

    // Normalize images to JSON string
    let images = data.images ?? '[]';
    if (Array.isArray(images)) {
      images = JSON.stringify(images);
    }

    // Normalize tags to JSON string
    let tags = data.tags ?? '[]';
    if (Array.isArray(tags)) {
      tags = JSON.stringify(tags);
    }

    const product = await db.product.create({
      data: {
        merchantId,
        name: data.name,
        description: data.description ?? null,
        category: data.category,
        price: data.price,
        currency: data.currency ?? 'XOF',
        images,
        stock: data.stock ?? 0,
        isAvailable: data.isAvailable ?? true,
        isPreOrder: data.isPreOrder ?? false,
        tags,
        discountPercent: data.discountPercent ?? 0,
      },
    });

    return product;
  } catch (error) {
    console.error('[merchant.service] createProduct error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 12. updateProduct — Partial update
// ---------------------------------------------------------------------------
export async function updateProduct(id: string, data: UpdateProductInput) {
  try {
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      console.error(`[merchant.service] updateProduct: product not found: ${id}`);
      return null;
    }

    // Normalize images/tags if they're arrays
    const updateData: Prisma.ProductUpdateInput = { ...data };
    if (data.images !== undefined && Array.isArray(data.images)) {
      (updateData as Record<string, unknown>).images = JSON.stringify(data.images);
    }
    if (data.tags !== undefined && Array.isArray(data.tags)) {
      (updateData as Record<string, unknown>).tags = JSON.stringify(data.tags);
    }

    const product = await db.product.update({
      where: { id },
      data: updateData,
    });

    return product;
  } catch (error) {
    console.error('[merchant.service] updateProduct error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 13. deleteProduct — Hard delete
// ---------------------------------------------------------------------------
export async function deleteProduct(id: string) {
  try {
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      console.error(`[merchant.service] deleteProduct: product not found: ${id}`);
      return null;
    }

    await db.product.delete({ where: { id } });

    return { success: true, deletedId: id };
  } catch (error) {
    console.error('[merchant.service] deleteProduct error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 14. searchProducts — Full text search across products
// ---------------------------------------------------------------------------
export async function searchProducts(
  query: string,
  filters?: {
    merchantId?: string;
    category?: string;
    isAvailable?: boolean;
    minPrice?: number;
    maxPrice?: number;
  },
) {
  try {
    const where: Prisma.ProductWhereInput = {
      AND: [
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { tags: { contains: query } },
            { category: { contains: query, mode: 'insensitive' } },
          ],
        },
      ],
    };

    if (filters?.merchantId) {
      (where.AND as Prisma.ProductWhereInput[]).push({ merchantId: filters.merchantId });
    }
    if (filters?.category) {
      (where.AND as Prisma.ProductWhereInput[]).push({ category: filters.category });
    }
    if (filters?.isAvailable !== undefined) {
      (where.AND as Prisma.ProductWhereInput[]).push({ isAvailable: filters.isAvailable });
    }
    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      const priceFilter: Prisma.FloatNullableFilter = {};
      if (filters.minPrice !== undefined) priceFilter.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) priceFilter.lte = filters.maxPrice;
      (where.AND as Prisma.ProductWhereInput[]).push({ price: priceFilter });
    }

    const products = await db.product.findMany({
      where,
      include: {
        merchant: {
          select: { id: true, name: true, logo: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products;
  } catch (error) {
    console.error('[merchant.service] searchProducts error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 15. generateOrderNumber — Format: ORD-YYYY-XXXXXX (unique, retry on collision)
// ---------------------------------------------------------------------------
export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const orderNumber = `ORD-${year}-${code}`;

    const existing = await db.order.findUnique({
      where: { orderNumber },
    });

    if (!existing) {
      return orderNumber;
    }
  }

  // Fallback: use timestamp-based approach
  return `ORD-${year}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// ---------------------------------------------------------------------------
// 16. createOrder — Full business logic with transaction
// ---------------------------------------------------------------------------
export async function createOrder(data: CreateOrderInput) {
  try {
    const {
      merchantId,
      customerName,
      customerPhone,
      customerEmail,
      flightNumber,
      gate,
      type = 'pickup',
      items,
      scheduledTime,
      notes,
    } = data;

    // 1. Validate merchant exists and is active
    const merchant = await db.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) {
      throw new Error('Merchant not found');
    }
    if (!merchant.isActive) {
      throw new Error('Merchant is not active');
    }

    // 2. Validate items
    if (!items || items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    // 3. Validate each item and calculate totals
    const orderItems: {
      productId: string;
      productName: string;
      productImage: string | null;
      quantity: number;
      unitPrice: number;
      discount: number;
      total: number;
      customizations: string | null;
    }[] = [];

    let subtotal = 0;

    for (const item of items) {
      if (!item.productId || !item.productName || !item.quantity || item.quantity < 1) {
        throw new Error(
          `Invalid item: productId, productName, and quantity (>=1) are required`,
        );
      }

      // Fetch product to validate and get price
      const product = await db.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      if (!product.isAvailable && !product.isPreOrder) {
        throw new Error(`Product is not available: ${item.productName}`);
      }
      if (product.stock < item.quantity && !product.isPreOrder) {
        throw new Error(
          `Insufficient stock for ${item.productName}. Available: ${product.stock}, Requested: ${item.quantity}`,
        );
      }

      const unitPrice = product.price;
      const discount = (unitPrice * (product.discountPercent || 0) * item.quantity) / 100;
      const itemTotal = unitPrice * item.quantity - discount;

      orderItems.push({
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage ?? null,
        quantity: item.quantity,
        unitPrice,
        discount,
        total: itemTotal,
        customizations: item.customizations ?? null,
      });

      subtotal += itemTotal;
    }

    // 4. Calculate tax, delivery fee, total
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const deliveryFee = type === 'delivery_gate' ? DELIVERY_GATE_FEE : 0;
    const total = Math.round((subtotal + tax + deliveryFee) * 100) / 100;

    // 5. Generate unique order number
    const orderNumber = await generateOrderNumber();

    // 6. Execute in transaction
    const order = await db.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          merchantId,
          airportCode: merchant.airportCode,
          customerName,
          customerPhone,
          customerEmail: customerEmail ?? null,
          flightNumber: flightNumber ?? null,
          gate: gate ?? null,
          type,
          status: 'pending',
          subtotal,
          tax,
          deliveryFee,
          total,
          currency: 'XOF',
          scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
          notes: notes ?? null,
          items: {
            create: orderItems,
          },
        },
        include: { items: true },
      });

      // Decrement stock for each item
      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Update merchant totals
      await tx.merchant.update({
        where: { id: merchantId },
        data: {
          totalOrders: { increment: 1 },
        },
      });

      return newOrder;
    });

    return order;
  } catch (error) {
    console.error('[merchant.service] createOrder error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 17. getOrders — List with filters, include merchant
// ---------------------------------------------------------------------------
export async function getOrders(
  merchantId?: string,
  status?: string,
  customerPhone?: string,
) {
  try {
    const where: Prisma.OrderWhereInput = {};

    if (merchantId) {
      where.merchantId = merchantId;
    }
    if (status) {
      where.status = status;
    }
    if (customerPhone) {
      where.customerPhone = customerPhone;
    }

    const orders = await db.order.findMany({
      where,
      include: {
        merchant: {
          select: { id: true, name: true, logo: true },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders;
  } catch (error) {
    console.error('[merchant.service] getOrders error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 18. getOrderByNumber — With items
// ---------------------------------------------------------------------------
export async function getOrderByNumber(orderNumber: string) {
  try {
    const order = await db.order.findUnique({
      where: { orderNumber },
      include: {
        merchant: {
          select: { id: true, name: true, logo: true, terminal: true },
        },
        items: true,
      },
    });

    if (!order) {
      console.error(`[merchant.service] getOrderByNumber: order not found: ${orderNumber}`);
      return null;
    }

    return order;
  } catch (error) {
    console.error('[merchant.service] getOrderByNumber error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 19. updateOrderStatus — With status transition validation
// ---------------------------------------------------------------------------
export async function updateOrderStatus(orderId: string, status: string) {
  try {
    // Validate status
    if (!VALID_ORDER_STATUSES.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(', ')}`);
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Validate transition
    const allowedTransitions = STATUS_TRANSITIONS[order.status] || [];
    if (!allowedTransitions.includes(status)) {
      throw new Error(
        `Cannot transition order from "${order.status}" to "${status}". ` +
          `Allowed: ${allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'none (terminal state)'}`,
      );
    }

    const updatedOrder = await db.$transaction(async (tx) => {
      // Build update data
      const updateData: Prisma.OrderUpdateInput = { status };

      if (status === 'completed') {
        updateData.completedAt = new Date();
        // Update merchant totalSales
        await tx.merchant.update({
          where: { id: order.merchantId },
          data: {
            totalSales: { increment: order.total },
          },
        });
      }

      if (status === 'cancelled') {
        updateData.cancelledAt = new Date();
        // Restore stock
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      const result = await tx.order.update({
        where: { id: orderId },
        data: updateData,
        include: { items: true, merchant: { select: { id: true, name: true } } },
      });

      return result;
    });

    return updatedOrder;
  } catch (error) {
    console.error('[merchant.service] updateOrderStatus error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 20. cancelOrder — Cancel + restore stock
// ---------------------------------------------------------------------------
export async function cancelOrder(orderId: string, reason?: string) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'cancelled') {
      throw new Error('Order is already cancelled');
    }

    if (order.status === 'completed') {
      throw new Error('Cannot cancel a completed order');
    }

    const updatedOrder = await db.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: reason ?? null,
        },
        include: { items: true, merchant: { select: { id: true, name: true } } },
      });

      // Restore stock for each item
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return result;
    });

    return updatedOrder;
  } catch (error) {
    console.error('[merchant.service] cancelOrder error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 21. getReviews — List with merchant info
// ---------------------------------------------------------------------------
export async function getReviews(merchantId?: string, rating?: number) {
  try {
    const where: Prisma.ReviewWhereInput = {};

    if (merchantId) {
      where.merchantId = merchantId;
    }
    if (rating !== undefined && rating >= 1 && rating <= 5) {
      where.rating = rating;
    }

    const reviews = await db.review.findMany({
      where,
      include: {
        merchant: {
          select: { id: true, name: true, logo: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews;
  } catch (error) {
    console.error('[merchant.service] getReviews error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 22. createReview — Create + recalculate merchant rating
// ---------------------------------------------------------------------------
export async function createReview(data: CreateReviewInput) {
  try {
    // Validate rating
    if (!data.rating || data.rating < 1 || data.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Validate merchant exists
    const merchant = await db.merchant.findUnique({
      where: { id: data.merchantId },
    });
    if (!merchant) {
      throw new Error('Merchant not found');
    }

    // Normalize images
    let images = data.images ?? '[]';
    if (Array.isArray(images)) {
      images = JSON.stringify(images);
    }

    const review = await db.review.create({
      data: {
        merchantId: data.merchantId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        orderId: data.orderId ?? null,
        rating: data.rating,
        comment: data.comment ?? null,
        images,
        isVerified: true,
      },
    });

    // Recalculate merchant rating
    await recalculateMerchantRating(data.merchantId);

    return review;
  } catch (error) {
    console.error('[merchant.service] createReview error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 23. respondToReview — Merchant responds + set respondedAt
// ---------------------------------------------------------------------------
export async function respondToReview(reviewId: string, response: string) {
  try {
    const existing = await db.review.findUnique({ where: { id: reviewId } });
    if (!existing) {
      console.error(`[merchant.service] respondToReview: review not found: ${reviewId}`);
      return null;
    }

    const review = await db.review.update({
      where: { id: reviewId },
      data: {
        response,
        respondedAt: new Date(),
      },
    });

    return review;
  } catch (error) {
    console.error('[merchant.service] respondToReview error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 24. recalculateMerchantRating — Average of all ratings
// ---------------------------------------------------------------------------
export async function recalculateMerchantRating(merchantId: string) {
  try {
    const result = await db.review.aggregate({
      where: { merchantId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const averageRating = Math.round((result._avg.rating ?? 0) * 10) / 10;
    const reviewsCount = result._count.rating;

    await db.merchant.update({
      where: { id: merchantId },
      data: { averageRating, reviewsCount },
    });

    return { averageRating, reviewsCount };
  } catch (error) {
    console.error('[merchant.service] recalculateMerchantRating error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 25. getWishlist — List with product info
// ---------------------------------------------------------------------------
export async function getWishlist(customerPhone: string) {
  try {
    const wishlist = await db.wishlist.findMany({
      where: { customerPhone },
      include: {
        product: {
          include: {
            merchant: {
              select: { id: true, name: true, logo: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return wishlist;
  } catch (error) {
    console.error('[merchant.service] getWishlist error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 26. addToWishlist — Create (ignore if exists)
// ---------------------------------------------------------------------------
export async function addToWishlist(customerPhone: string, productId: string) {
  try {
    // Check if product exists
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new Error('Product not found');
    }

    // Check if already in wishlist
    const existing = await db.wishlist.findUnique({
      where: {
        customerPhone_productId: { customerPhone, productId },
      },
    });

    if (existing) {
      return existing;
    }

    const wishlist = await db.wishlist.create({
      data: { customerPhone, productId },
    });

    return wishlist;
  } catch (error) {
    console.error('[merchant.service] addToWishlist error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 27. removeFromWishlist — Delete
// ---------------------------------------------------------------------------
export async function removeFromWishlist(customerPhone: string, productId: string) {
  try {
    const existing = await db.wishlist.findUnique({
      where: {
        customerPhone_productId: { customerPhone, productId },
      },
    });

    if (!existing) {
      return { success: true, message: 'Item not in wishlist' };
    }

    await db.wishlist.delete({
      where: {
        customerPhone_productId: { customerPhone, productId },
      },
    });

    return { success: true, deletedId: existing.id };
  } catch (error) {
    console.error('[merchant.service] removeFromWishlist error:', error);
    throw error;
  }
}
