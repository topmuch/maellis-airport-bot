import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Import email helper (API routes will call it, NOT this service)
// ---------------------------------------------------------------------------
import { sendLoungeConfirmation } from '@/lib/email';

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
    console.error('[lounge.service] getLounges error:', error);
    throw error;
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
    console.error('[lounge.service] getLoungeById error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 3. createLounge — Admin creates a lounge with ALL fields
// ---------------------------------------------------------------------------
export async function createLounge(data: CreateLoungeInput) {
  try {
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
        priceStandard: data.priceStandard ?? 0,
        priceBusiness: data.priceBusiness ?? 0,
        priceFirstClass: data.priceFirstClass ?? 0,
        priceChild: data.priceChild ?? 0,
        currency: data.currency ?? 'XOF',
        maxCapacity: data.maxCapacity ?? 50,
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
    console.error('[lounge.service] createLounge error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 4. updateLounge — Admin updates any field of a lounge
// ---------------------------------------------------------------------------
export async function updateLounge(id: string, data: UpdateLoungeInput) {
  try {
    // Verify the lounge exists
    const existing = await db.lounge.findUnique({ where: { id } });
    if (!existing) {
      console.error(`[lounge.service] updateLounge: lounge not found: ${id}`);
      return null;
    }

    const lounge = await db.lounge.update({
      where: { id },
      data: {
        ...data,
        // Only update location if explicitly provided (not undefined)
        ...(data.location !== undefined ? { location: data.location } : {}),
      },
    });

    return lounge;
  } catch (error) {
    console.error('[lounge.service] updateLounge error:', error);
    throw error;
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
    console.error('[lounge.service] deleteLounge error:', error);
    throw error;
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
    const lounge = await db.lounge.findUnique({ where: { id: loungeId } });
    if (!lounge) {
      throw new Error('Lounge not found');
    }

    // Count confirmed bookings for this lounge on this date
    const occupied = await db.loungeBooking.count({
      where: {
        loungeId,
        bookingDate: date,
        status: {
          in: ['confirmed', 'checked_in'],
        },
      },
    });

    // Sum up guests, not just booking count
    const bookingsOnDate = await db.loungeBooking.aggregate({
      _sum: { guests: true },
      where: {
        loungeId,
        bookingDate: date,
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
    console.error('[lounge.service] checkAvailability error:', error);
    throw error;
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
    totalPrice: unitPrice * guests,
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

    const guestCount = guests ?? 1;
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
    const namePrefix = passengerName.substring(0, 2).toUpperCase();
    const randomDigits = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    const bookingRef = `LNG-${namePrefix}-${randomDigits}`;

    // 6. Create booking with all fields
    const booking = await db.loungeBooking.create({
      data: {
        loungeId,
        loungeName: lounge.name,
        airportCode: lounge.airportCode,
        passengerName,
        phone,
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
    console.error('[lounge.service] createBooking error:', error);
    throw error;
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
    console.error('[lounge.service] cancelBooking error:', error);
    throw error;
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
    const where: Prisma.LoungeBookingWhereInput = {};

    if (loungeId) {
      where.loungeId = loungeId;
    }

    if (status) {
      where.status = status;
    }

    if (date) {
      where.bookingDate = date;
    }

    const bookings = await db.loungeBooking.findMany({
      where,
      include: {
        lounge: {
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
    console.error('[lounge.service] getLoungeBookings error:', error);
    throw error;
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
    console.error('[lounge.service] getLoungeBookingsByDate error:', error);
    throw error;
  }
}
