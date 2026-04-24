import { db } from '@/lib/db';
import { createOrder } from '@/lib/services/merchant.service';
import type { Cart, CartItem } from '@prisma/client';

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------

export interface CartWithTotals {
  cart: Cart & { items: CartItem[] };
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
}

export interface AddToCartInput {
  productId: string;
  quantity: number;
}

export interface CheckoutInput {
  type: 'pickup' | 'delivery_gate';
  customerName: string;
  customerEmail?: string;
  flightNumber?: string;
  gate?: string;
  scheduledTime?: string;
  notes?: string;
  paymentMethod: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAX_RATE = 0.18;
const DELIVERY_GATE_FEE = 500;

// ---------------------------------------------------------------------------
// 8. computeCartTotals — Pure helper, no DB calls
// ---------------------------------------------------------------------------

export function computeCartTotals(
  items: CartItem[],
  type?: string,
): Pick<CartWithTotals, 'subtotal' | 'tax' | 'deliveryFee' | 'total' | 'itemCount'> {
  let subtotal = 0;
  let itemCount = 0;

  for (const item of items) {
    const lineTotal = item.unitPrice * item.quantity;
    const discount = (lineTotal * item.discountPercent) / 100;
    subtotal += lineTotal - discount;
    itemCount += item.quantity;
  }

  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const deliveryFee = type === 'delivery_gate' ? DELIVERY_GATE_FEE : 0;
  const total = Math.round((subtotal + tax + deliveryFee) * 100) / 100;

  return { subtotal, tax, deliveryFee, total, itemCount };
}

// ---------------------------------------------------------------------------
// Internal helper: load cart with items, return null when not found
// ---------------------------------------------------------------------------

async function loadCart(customerPhone: string): Promise<CartWithTotals | null> {
  const cart = await db.cart.findUnique({
    where: { customerPhone },
    include: { items: true },
  });

  if (!cart) return null;

  const totals = computeCartTotals(cart.items);
  return { cart, ...totals };
}

// ---------------------------------------------------------------------------
// 1. getCart — Return cart + computed totals, or null
// ---------------------------------------------------------------------------

export async function getCart(customerPhone: string): Promise<CartWithTotals | null> {
  try {
    return await loadCart(customerPhone);
  } catch (error) {
    console.error('[cart.service] getCart error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 2. getOrCreateCart — Get existing or create empty cart
// ---------------------------------------------------------------------------

export async function getOrCreateCart(customerPhone: string): Promise<CartWithTotals> {
  try {
    const existing = await loadCart(customerPhone);
    if (existing) return existing;

    const cart = await db.cart.create({
      data: { customerPhone },
      include: { items: true },
    });

    const totals = computeCartTotals(cart.items);
    return { cart, ...totals };
  } catch (error) {
    console.error('[cart.service] getOrCreateCart error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 3. addToCart — Validate product, upsert item, return updated cart
// ---------------------------------------------------------------------------

export async function addToCart(
  customerPhone: string,
  input: AddToCartInput,
): Promise<CartWithTotals> {
  try {
    // --- Validate product ---
    const product = await db.product.findUnique({
      where: { id: input.productId },
      include: { merchant: { select: { id: true, name: true, isActive: true } } },
    });

    if (!product) {
      throw new Error(`Product not found: ${input.productId}`);
    }

    if (!product.isAvailable && !product.isPreOrder) {
      throw new Error(`Product "${product.name}" is not available`);
    }

    if (product.stock < input.quantity && !product.isPreOrder) {
      throw new Error(
        `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${input.quantity}`,
      );
    }

    if (!product.merchant.isActive) {
      throw new Error(`Merchant "${product.merchant.name}" is not active`);
    }

    // --- Get or create cart ---
    const cartResult = await getOrCreateCart(customerPhone);
    const cartId = cartResult.cart.id;

    // --- Parse product image (images is a JSON string array) ---
    let productImage: string | null = null;
    try {
      const images: string[] = JSON.parse(product.images);
      if (Array.isArray(images) && images.length > 0) {
        productImage = images[0];
      }
    } catch {
      productImage = null;
    }

    // --- Check if item already in cart ---
    const existingItem = cartResult.cart.items.find(
      (item) => item.productId === input.productId,
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + input.quantity;

      // Re-validate stock with the combined quantity
      if (!product.isPreOrder && product.stock < newQuantity) {
        throw new Error(
          `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${newQuantity}`,
        );
      }

      await db.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await db.cartItem.create({
        data: {
          cartId,
          productId: product.id,
          productName: product.name,
          productImage,
          merchantId: product.merchantId,
          merchantName: product.merchant.name,
          quantity: input.quantity,
          unitPrice: product.price,
          discountPercent: product.discountPercent,
        },
      });
    }

    // --- Return updated cart ---
    const updated = await loadCart(customerPhone);
    if (!updated) {
      throw new Error('Failed to reload cart after adding item');
    }

    return updated;
  } catch (error) {
    console.error('[cart.service] addToCart error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 4. updateCartItem — Update quantity or remove if <= 0
// ---------------------------------------------------------------------------

export async function updateCartItem(
  customerPhone: string,
  cartItemId: string,
  quantity: number,
): Promise<CartWithTotals> {
  try {
    const cart = await db.cart.findUnique({
      where: { customerPhone },
      include: { items: true },
    });

    if (!cart) {
      throw new Error('Cart not found');
    }

    const cartItem = cart.items.find((item) => item.id === cartItemId);
    if (!cartItem) {
      throw new Error(`Cart item not found: ${cartItemId}`);
    }

    // --- Remove if quantity <= 0 ---
    if (quantity <= 0) {
      await db.cartItem.delete({ where: { id: cartItemId } });
    } else {
      // --- Validate stock if increasing quantity ---
      if (quantity > cartItem.quantity) {
        const product = await db.product.findUnique({
          where: { id: cartItem.productId },
          select: { stock: true, isPreOrder: true, name: true },
        });

        if (product && !product.isPreOrder && product.stock < quantity) {
          throw new Error(
            `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${quantity}`,
          );
        }
      }

      await db.cartItem.update({
        where: { id: cartItemId },
        data: { quantity },
      });
    }

    // --- Return updated cart ---
    const updated = await loadCart(customerPhone);
    if (!updated) {
      throw new Error('Failed to reload cart after updating item');
    }

    return updated;
  } catch (error) {
    console.error('[cart.service] updateCartItem error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 5. removeFromCart — Remove single item from cart
// ---------------------------------------------------------------------------

export async function removeFromCart(
  customerPhone: string,
  cartItemId: string,
): Promise<CartWithTotals> {
  try {
    const cart = await db.cart.findUnique({
      where: { customerPhone },
      include: { items: true },
    });

    if (!cart) {
      throw new Error('Cart not found');
    }

    const cartItem = cart.items.find((item) => item.id === cartItemId);
    if (!cartItem) {
      throw new Error(`Cart item not found: ${cartItemId}`);
    }

    await db.cartItem.delete({ where: { id: cartItemId } });

    // --- Return updated cart ---
    const updated = await loadCart(customerPhone);
    if (!updated) {
      throw new Error('Failed to reload cart after removing item');
    }

    return updated;
  } catch (error) {
    console.error('[cart.service] removeFromCart error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 6. clearCart — Delete entire cart
// ---------------------------------------------------------------------------

export async function clearCart(customerPhone: string): Promise<void> {
  try {
    const cart = await db.cart.findUnique({ where: { customerPhone } });
    if (!cart) return;

    await db.cart.delete({ where: { id: cart.id } });
  } catch (error) {
    console.error('[cart.service] clearCart error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 7. checkoutCart — Validate, create orders per merchant, clear cart
// ---------------------------------------------------------------------------

export async function checkoutCart(customerPhone: string, data: CheckoutInput) {
  try {
    // --- Validate cart exists and has items ---
    const cart = await db.cart.findUnique({
      where: { customerPhone },
      include: { items: true },
    });

    if (!cart) {
      throw new Error('Cart not found');
    }

    if (cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // --- Validate all products are still available with sufficient stock ---
    const productIds = cart.items.map((item) => item.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const cartItem of cart.items) {
      const product = productMap.get(cartItem.productId);
      if (!product) {
        throw new Error(`Product no longer exists: ${cartItem.productName}`);
      }
      if (!product.isAvailable && !product.isPreOrder) {
        throw new Error(`Product "${product.name}" is no longer available`);
      }
      if (!product.isPreOrder && product.stock < cartItem.quantity) {
        throw new Error(
          `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${cartItem.quantity}`,
        );
      }
      // Also verify the merchant is still active
      const merchant = await db.merchant.findUnique({
        where: { id: product.merchantId },
        select: { isActive: true, name: true },
      });
      if (!merchant || !merchant.isActive) {
        throw new Error(`Merchant "${merchant?.name ?? 'Unknown'}" is no longer active`);
      }
    }

    // --- Group items by merchant ---
    const itemsByMerchant = new Map<
      string,
      CartItem[]
    >();

    for (const item of cart.items) {
      const merchantId = item.merchantId;
      if (!itemsByMerchant.has(merchantId)) {
        itemsByMerchant.set(merchantId, []);
      }
      itemsByMerchant.get(merchantId)!.push(item);
    }

    // --- Create one order per merchant ---
    const orders = [];

    for (const [merchantId, merchantItems] of itemsByMerchant) {
      const merchantTotals = computeCartTotals(merchantItems, data.type);

      const order = await createOrder({
        merchantId,
        customerName: data.customerName,
        customerPhone,
        customerEmail: data.customerEmail,
        flightNumber: data.flightNumber,
        gate: data.gate,
        type: data.type,
        items: merchantItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage ?? undefined,
          quantity: item.quantity,
        })),
        scheduledTime: data.scheduledTime,
        notes: data.notes,
      });

      orders.push(order);
    }

    // --- Clear the cart ---
    await clearCart(customerPhone);

    return {
      orders,
      ordersCount: orders.length,
      customerPhone,
    };
  } catch (error) {
    console.error('[cart.service] checkoutCart error:', error);
    throw error;
  }
}
