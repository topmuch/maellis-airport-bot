import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Import email helper (API routes will call it, NOT this service)
// ---------------------------------------------------------------------------
import { sendLoungeConfirmation } from '@/lib/email';

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

/** Validate a positive finite number (must be >= 1 for counts) */
function validatePositiveInteger(value: unknown, fieldName: string, min = 1): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || Math.floor(n) !== n) {
    throw new Error(`${fieldName} must be an integer >= ${min}`);
  }
  return n;
}

/** Validate a non-negative finite number (must be >= 0) */
function validateNonNegative(value: unknown, fieldName: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
  return n;
}

/** Wrap error to prevent internal details from leaking */
function safeError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[lounge.service] ${context}:`, message);
  if (error instanceof Error) {
    return new Error(error.message.includes('Prisma') ? 'Database error' : error.message);
  }
  return new Error('An unexpected error occurred');
}

/** Validate phone format */
function validatePhone(phone: unknown, fieldName = 'phone'): string {
  if (typeof phone !== 'string' || !/^[+\d\s\-()]{6,20}$/.test(phone.trim())) {
    throw new Error(`Invalid ${fieldName}: must be 6-20 characters and contain only digits, spaces, +, -, ()`);
  }
  return phone.trim();
}

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------

export interface CreateLoungeInput {
  airportCode: string;
  name: string;
  description?: string;
  terminal?: string;
  gateLocation?: string;
  location?: string;
  imageUrl?: string;
  priceStandard?: number;
  priceBusiness?: number;
  priceFirstClass?: number;
  priceChild?: number;
  currency?: string;
  maxCapacity?: number;
  openingTime?: string;
  closingTime?: string;
  openingHours?: string;
  amenities?: string; // JSON string
  accessLevel?: string;
}

export interface UpdateLoungeInput {
  name?: string;
  description?: string;
  terminal?: string;
  gateLocation?: string;
  location?: string;
  imageUrl?: string;
  priceStandard?: number;
  priceBusiness?: number;
  priceFirstClass?: number;
  priceChild?: number;
  currency?: string;
  maxCapacity?: number;
  currentOccupancy?: number;
  isOpen?: boolean;
  openingTime?: string;
  closingTime?: string;
  openingHours?: string;
  amenities?: string;
  accessLevel?: string;
}

export interface CreateBookingInput {
  loungeId: string;
  passengerName: string;
  phone: string;
  email?: string;
  bookingDate: string;
  startTime: string;
  durationHours?: number;
  guests?: number;
 ticketClass?: string;
  accessLevel?: string; // Legacy compat — maps to ticketClass
  flightNumber?: string;
  paymentMethod?: string;
}

export interface AvailabilityResult {
  available: boolean;
  occupied: number;
  capacity: number;
}

export type TicketClass = 'standard' | 'business' | 'first' | 'child';

// ─── Zod Validation Schemas ──────────────────────────────────────────────

const loungeBookingStatusEnum = z.enum(['confirmed', 'cancelled', 'completed', 'checked_in', 'expired']);
const yyyyMmddRegex = /^\d{4}-\d{2}-\d{2}$/;
const dateSchema = z.string().regex(yyyyMmddRegex, 'Must be a valid date in YYYY-MM-DD format');

const updateLoungeFieldSchemas = {
  name: z.string().min(1).max(200, 'name must be 1-200 characters'),
  description: z.string().max(2000, 'description must be at most 2000 characters'),
  terminal: z.string().max(10, 'terminal must be at most 10 characters'),
  gateLocation: z.string().max(50, 'gateLocation must be at most 50 characters'),
  location: z.string().max(200, 'location must be at most 200 characters'),
  imageUrl: z.string().max(500, 'imageUrl must be at most 500 characters').nullable(),
  priceStandard: z.number().min(0, 'priceStandard must be non-negative'),
  priceBusiness: z.number().min(0, 'priceBusiness must be non-negative'),
  priceFirstClass: z.number().min(0, 'priceFirstClass must be non-negative'),
  priceChild: z.number().min(0, 'priceChild must be non-negative'),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Currency must be a valid ISO 4217 code'),
  maxCapacity: z.number().int().min(1, 'maxCapacity must be a positive integer'),
  currentOccupancy: z.number().int().min(0, 'currentOccupancy must be a non-negative integer'),
  isOpen: z.boolean(),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/, 'openingTime must be in HH:MM format'),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/, 'closingTime must be in HH:MM format'),
  openingHours: z.string().max(100, 'openingHours must be at most 100 characters'),
  amenities: z.string().max(2000, 'amenities must be at most 2000 characters'),
  accessLevel: z.string().max(50, 'accessLevel must be at most 50 characters'),
} as const;

type UpdateLoungeFieldKey = keyof typeof updateLoungeFieldSchemas;

const getLoungeBookingsSchema = z.object({
  loungeId: z.string().optional(),
  status: loungeBookingStatusEnum.optional(),
  date: dateSchema.optional(),
});

const checkAvailabilitySchema = z.object({
  loungeId: z.string().min(1, 'loungeId is required'),
  date: dateSchema,
});

// ---------------------------------------------------------------------------
// Public fields returned by list endpoints (no internal/admin fields leaked)
// ---------------------------------------------------------------------------
const PUBLIC_LOUNGE_FIELDS = {
  id: true,
  airportCode: true,
  name: true,
  description: true,
  terminal: true,
  gateLocation: true,
  location: true,
  imageUrl: true,
  priceStandard: true,
  priceBusiness: true,
  priceFirstClass: true,
  priceChild: true,
  currency: true,
  maxCapacity: true,
  currentOccupancy: true,
  isOpen: true,
  openingTime: true,
  closingTime: true,
  openingHours: true,
  amenities: true,
  accessLevel: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ---------------------------------------------------------------------------
// 1. getLounges — List lounges for an airport
// ---------------------------------------------------------------------------
export async function getLounges(
  airportCode: string,
  activeOnly: boolean = true,
) {
  try {
    const where: Prisma.LoungeWhereInput = {
      airportCode: airportCode.toUpperCase(),
    };

    if (activeOnly) {
      where.isOpen = true;
    }

    const lounges = await db.lounge.findMany({
      where,
      select: PUBLIC_LOUNGE_FIELDS,
      orderBy: { name: 'asc' },
    });

    return lounges;
  } catch (error) {
    throw safeError(error, 'getLounges');
  }
}

// ---------------------------------------------------------------------------
// 2. getLoungeById — Get a single lounge by ID
// ---------------------------------------------------------------------------
export async function getLoungeById(id: string) {
  try {
    const lounge = await db.lounge.findUnique({
      where: { id },
    });

    if (!lounge) {
      console.error(`[lounge.service] Lounge not found: ${id}`);
      return null;
    }

    return lounge;
  } catch (error) {
    throw safeError(error, 'getLoungeById');
  }
}

// ---------------------------------------------------------------------------
// 3. createLounge — Admin creates a lounge with ALL fields
// ---------------------------------------------------------------------------
export async function createLounge(data: CreateLoungeInput) {
  try {
    // Validate pricing fields
    const safePriceStandard = validateNonNegative(data.priceStandard ?? 0, 'priceStandard');
    const safePriceBusiness = validateNonNegative(data.priceBusiness ?? 0, 'priceBusiness');
    const safePriceFirstClass = validateNonNegative(data.priceFirstClass ?? 0, 'priceFirstClass');
    const safePriceChild = validateNonNegative(data.priceChild ?? 0, 'priceChild');
    const safeMaxCapacity = validatePositiveInteger(data.maxCapacity ?? 50, 'maxCapacity');

    const lounge = await db.lounge.create({
      data: {
        airportCode: data.airportCode.toUpperCase(),
        name: data.name,
        description: data.description ?? null,
        terminal: data.terminal ?? '',
        gateLocation: data.gateLocation ?? '',
        location:
          data.location ??
          `${data.terminal ?? ''} ${data.gateLocation ?? ''}`.trim(),
        imageUrl: data.imageUrl ?? null,
        priceStandard: safePriceStandard,
        priceBusiness: safePriceBusiness,
        priceFirstClass: safePriceFirstClass,
        priceChild: safePriceChild,
        currency: data.currency ?? 'XOF',
        maxCapacity: safeMaxCapacity,
        currentOccupancy: 0,
        isOpen: true,
        openingTime: data.openingTime ?? '06:00',
        closingTime: data.closingTime ?? '22:00',
        openingHours:
          data.openingHours ??
          `"${data.openingTime ?? '06:00'}-${data.closingTime ?? '22:00'}"`,
        amenities: data.amenities ?? '[]',
        accessLevel: data.accessLevel ?? 'all',
      },
    });

    return lounge;
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.includes('must be'))) {
      throw error;
    }
    throw safeError(error, 'createLounge');
  }
}

// ---------------------------------------------------------------------------
// 4. updateLounge — Admin updates any field of a lounge
// ---------------------------------------------------------------------------
export async function updateLounge(id: string, data: UpdateLoungeInput) {
  try {
    // ─── Zod field-by-field validation (partial update) ────────────────────
    const validatedData: Record<string, unknown> = {};
    const validationErrors: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      const fieldSchema = updateLoungeFieldSchemas[key as UpdateLoungeFieldKey];
      if (!fieldSchema) {
        validationErrors.push(`Unknown field: ${key}`);
        continue;
      }
      const result = fieldSchema.safeParse(value);
      if (!result.success) {
        validationErrors.push(`${key}: ${result.error.issues.map(i => i.message).join(', ')}`);
      } else {
        validatedData[key] = result.data;
      }
    }

    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join('; ')}`);
    }

    // Verify the lounge exists
    const existing = await db.lounge.findUnique({ where: { id } });
    if (!existing) {
      console.error(`[lounge.service] updateLounge: lounge not found: ${id}`);
      return null;
    }

    const lounge = await db.lounge.update({
      where: { id },
      data: validatedData,
    });

    return lounge;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Validation failed')) {
      throw error;
    }
    throw safeError(error, 'updateLounge');
  }
}

// ---------------------------------------------------------------------------
// 5. deleteLounge — Admin soft delete (set isOpen=false)
// ---------------------------------------------------------------------------
export async function deleteLounge(id: string) {
  try {
    // Verify the lounge exists
    const existing = await db.lounge.findUnique({ where: { id } });
    if (!existing) {
      console.error(`[lounge.service] deleteLounge: lounge not found: ${id}`);
      return null;
    }

    const lounge = await db.lounge.update({
      where: { id },
      data: { isOpen: false },
    });

    return { success: true, deletedId: id, lounge };
  } catch (error) {
    throw safeError(error, 'deleteLounge');
  }
}

// ---------------------------------------------------------------------------
// 6. checkAvailability — Check if a lounge has capacity for a given date
// ---------------------------------------------------------------------------
export async function checkAvailability(
  loungeId: string,
  date: string,
): Promise<AvailabilityResult> {
  try {
    // Zod validation
    const parsed = checkAvailabilitySchema.safeParse({ loungeId, date });
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`);
    }

    const lounge = await db.lounge.findUnique({ where: { id: parsed.data.loungeId } });
    if (!lounge) {
      throw new Error('Lounge not found');
    }

    const validatedDate = parsed.data.date;

    // Count confirmed bookings for this lounge on this date
    const occupied = await db.loungeBooking.count({
      where: {
        loungeId: parsed.data.loungeId,
        bookingDate: validatedDate,
        status: {
          in: ['confirmed', 'checked_in'],
        },
      },
    });

    // Sum up guests, not just booking count
    const bookingsOnDate = await db.loungeBooking.aggregate({
      _sum: { guests: true },
      where: {
        loungeId: parsed.data.loungeId,
        bookingDate: validatedDate,
        status: {
          in: ['confirmed', 'checked_in'],
        },
      },
    });

    const occupiedGuests = bookingsOnDate._sum.guests ?? 0;
    const capacity = lounge.maxCapacity;

    return {
      available: occupiedGuests < capacity,
      occupied: occupiedGuests,
      capacity,
    };
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Validation failed') || error.message.startsWith('Lounge'))) {
      throw error;
    }
    throw safeError(error, 'checkAvailability');
  }
}

// ---------------------------------------------------------------------------
// 7. calculatePrice — THE KEY pricing function
// ---------------------------------------------------------------------------
export function calculatePrice(
  lounge: {
    priceStandard: number;
    priceBusiness: number;
    priceFirstClass: number;
    priceChild: number;
  },
  ticketClass: string,
  guests: number,
): { unitPrice: number; totalPrice: number } {
  // Validate guests
  const safeGuests = Number(guests);
  if (!Number.isFinite(safeGuests) || safeGuests < 1) {
    throw new Error('guests must be a positive number');
  }

  let unitPrice: number;

  switch (ticketClass) {
    case 'first':
      unitPrice = lounge.priceFirstClass || 0;
      break;
    case 'business':
      unitPrice = lounge.priceBusiness;
      break;
    case 'child':
      unitPrice = lounge.priceChild;
      break;
    default:
      unitPrice = lounge.priceStandard;
      break;
  }

  return {
    unitPrice,
    totalPrice: unitPrice * safeGuests,
  };
}

// ---------------------------------------------------------------------------
// 8. createBooking — FULL booking logic
// ---------------------------------------------------------------------------
export async function createBooking(data: CreateBookingInput) {
  try {
    const {
      loungeId,
      passengerName,
      phone,
      email,
      bookingDate,
      startTime,
      durationHours,
      guests,
      ticketClass,
      accessLevel,
      flightNumber,
      paymentMethod,
    } = data;

    // Validate inputs
    if (typeof passengerName !== 'string' || passengerName.trim().length === 0) {
      throw new Error('passengerName is required');
    }
    if (passengerName.length > 100) {
      throw new Error('passengerName must be at most 100 characters');
    }
    const safePassengerName = passengerName.trim().slice(0, 100);
    const safePhone = validatePhone(phone, 'phone');

    const guestCount = typeof guests === 'number' ? guests : 1;
    validatePositiveInteger(guestCount, 'guests');
    // ticketClass takes priority; fall back to accessLevel for backward compat
    const resolvedTicketClass: TicketClass =
      (ticketClass ?? accessLevel ?? 'standard') as TicketClass;

    // 1. Fetch lounge
    const lounge = await db.lounge.findUnique({ where: { id: loungeId } });
    if (!lounge) {
      throw new Error('Lounge not found');
    }

    // 2. Verify isOpen
    if (!lounge.isOpen) {
      throw new Error('Lounge is currently closed');
    }

    // 3. Check availability (count bookings for date, compare with capacity)
    const availability = await checkAvailability(loungeId, bookingDate);
    if (!availability.available) {
      throw new Error(
        `Lounge is full for ${bookingDate}. Current occupancy: ${availability.occupied}/${availability.capacity}`,
      );
    }

    // Double-check with actual guest count
    if (availability.occupied + guestCount > availability.capacity) {
      throw new Error(
        `Insufficient capacity. Current occupancy: ${availability.occupied}, ` +
          `Requested guests: ${guestCount}, Max capacity: ${availability.capacity}`,
      );
    }

    // 4. Calculate price based on ticketClass
    const { unitPrice, totalPrice } = calculatePrice(
      lounge,
      resolvedTicketClass,
      guestCount,
    );

    // 5. Generate bookingRef: LNG- + first 2 chars of passenger name + - + 3 random digits
    const namePrefix = safePassengerName.substring(0, 2).toUpperCase();
    const randomDigits = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    const bookingRef = `LNG-${namePrefix}-${randomDigits}`;

    // 6. Create booking with all fields
    const booking = await db.loungeBooking.create({
      data: {
        loungeId,
        loungeName: lounge.name,
        airportCode: lounge.airportCode,
        passengerName: safePassengerName,
        phone: safePhone,
        email: email ?? null,
        guests: guestCount,
        bookingDate,
        startTime,
        durationHours: durationHours ?? 3,
        ticketClass: resolvedTicketClass,
        flightNumber: flightNumber ?? null,
        unitPrice,
        totalPrice,
        paymentMethod: paymentMethod ?? null,
        paymentStatus: 'pending',
        bookingRef,
        status: 'confirmed',
      },
    });

    // 7. Increment lounge currentOccupancy
    await db.lounge.update({
      where: { id: loungeId },
      data: {
        currentOccupancy: {
          increment: guestCount,
        },
      },
    });

    // 8. Return booking
    return booking;
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.startsWith('guests') || error.message.startsWith('passengerName') || error.message.startsWith('Lounge') || error.message.startsWith('Insufficient'))) {
      throw error;
    }
    throw safeError(error, 'createBooking');
  }
}

// ---------------------------------------------------------------------------
// 9. cancelBooking — Cancel and decrement occupancy
// ---------------------------------------------------------------------------
export async function cancelBooking(bookingId: string) {
  try {
    // Fetch the booking
    const booking = await db.loungeBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === 'cancelled') {
      throw new Error('Booking is already cancelled');
    }

    // Update booking status to cancelled
    const updatedBooking = await db.loungeBooking.update({
      where: { id: bookingId },
      data: { status: 'cancelled' },
    });

    // Decrement lounge currentOccupancy
    if (booking.loungeId) {
      await db.lounge.update({
        where: { id: booking.loungeId },
        data: {
          currentOccupancy: {
            decrement: booking.guests,
          },
        },
      });
    }

    return updatedBooking;
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Booking') || error.message.startsWith('Cannot'))) {
      throw error;
    }
    throw safeError(error, 'cancelBooking');
  }
}

// ---------------------------------------------------------------------------
// 10. getLoungeBookings — List bookings with filters, include lounge info
// ---------------------------------------------------------------------------
export async function getLoungeBookings(
  loungeId?: string,
  status?: string,
  date?: string,
) {
  try {
    // Zod validation
    const parsed = getLoungeBookingsSchema.safeParse({ loungeId, status, date });
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`);
    }

    const where: Prisma.LoungeBookingWhereInput = {};

    if (parsed.data.loungeId) {
      where.loungeId = parsed.data.loungeId;
    }

    if (parsed.data.status) {
      where.status = parsed.data.status;
    }

    if (parsed.data.date) {
      where.bookingDate = parsed.data.date;
    }

    const bookings = await db.loungeBooking.findMany({
      where,
      include: {
        Lounge: {
          select: {
            id: true,
            name: true,
            airportCode: true,
            terminal: true,
            gateLocation: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Validation failed')) {
      throw error;
    }
    throw safeError(error, 'getLoungeBookings');
  }
}

// ---------------------------------------------------------------------------
// 11. getLoungeBookingsByDate — Helper for availability checks
// ---------------------------------------------------------------------------
export async function getLoungeBookingsByDate(loungeId: string, date: string) {
  try {
    const bookings = await db.loungeBooking.findMany({
      where: {
        loungeId,
        bookingDate: date,
        status: {
          in: ['confirmed', 'checked_in'],
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return bookings;
  } catch (error) {
    throw safeError(error, 'getLoungeBookingsByDate');
  }
}
