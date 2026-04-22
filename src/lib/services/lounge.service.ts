import { db } from '@/lib/db';

// ---------------------------------------------------------------------------
// Public fields returned by list endpoints (no internal/admin fields leaked)
// ---------------------------------------------------------------------------
const PUBLIC_LOUNGE_FIELDS = {
  id: true,
  airportCode: true,
  name: true,
  description: true,
  location: true,
  priceStandard: true,
  priceBusiness: true,
  currency: true,
  maxCapacity: true,
  currentOccupancy: true,
  openingHours: true,
  accessLevel: true,
  imageUrl: true,
  isOpen: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ---------------------------------------------------------------------------
// Get all lounges for an airport (public)
// ---------------------------------------------------------------------------
export async function getLounges(airportCode: string) {
  const lounges = await db.lounge.findMany({
    where: {
      airportCode: airportCode.toUpperCase(),
      isOpen: true,
    },
    select: PUBLIC_LOUNGE_FIELDS,
    orderBy: { name: 'asc' },
  });

  return lounges;
}

// ---------------------------------------------------------------------------
// Get a single lounge by ID
// ---------------------------------------------------------------------------
export async function getLoungeById(id: string) {
  const lounge = await db.lounge.findUnique({
    where: { id },
  });

  if (!lounge) {
    return null;
  }

  return lounge;
}

// ---------------------------------------------------------------------------
// Create a new lounge (admin only)
// ---------------------------------------------------------------------------
export async function createLounge(data: {
  airportCode: string;
  name: string;
  description?: string;
  location: string;
  priceStandard: number;
  priceBusiness?: number;
  currency?: string;
  maxCapacity?: number;
  openingHours?: string;
  accessLevel?: string;
  imageUrl?: string;
}) {
  const lounge = await db.lounge.create({
    data: {
      airportCode: data.airportCode.toUpperCase(),
      name: data.name,
      description: data.description ?? null,
      location: data.location,
      priceStandard: data.priceStandard,
      priceBusiness: data.priceBusiness ?? null,
      currency: data.currency ?? 'XOF',
      maxCapacity: data.maxCapacity ?? 50,
      currentOccupancy: 0,
      openingHours: data.openingHours ?? '06:00 – 22:00',
      accessLevel: data.accessLevel ?? 'standard',
      imageUrl: data.imageUrl ?? null,
      isOpen: true,
    },
  });

  return lounge;
}

// ---------------------------------------------------------------------------
// Update a lounge (admin only)
// ---------------------------------------------------------------------------
export async function updateLounge(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    location: string;
    imageUrl: string;
    priceStandard: number;
    priceBusiness: number;
    maxCapacity: number;
    currentOccupancy: number;
    isOpen: boolean;
    openingHours: string;
    accessLevel: string;
  }>,
) {
  // Verify the lounge exists
  const existing = await db.lounge.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  const lounge = await db.lounge.update({
    where: { id },
    data,
  });

  return lounge;
}

// ---------------------------------------------------------------------------
// Delete a lounge (admin only)
// ---------------------------------------------------------------------------
export async function deleteLounge(id: string) {
  // Verify the lounge exists
  const existing = await db.lounge.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  await db.lounge.delete({
    where: { id },
  });

  return { success: true, deletedId: id };
}

// ---------------------------------------------------------------------------
// Create a booking (with full business logic)
// ---------------------------------------------------------------------------
export async function createBooking(data: {
  loungeId: string;
  passengerName: string;
  phone: string;
  email?: string;
  bookingDate: string;
  startTime: string;
  durationHours?: number;
  guests?: number;
  accessLevel?: string;
}) {
  const {
    loungeId,
    passengerName,
    phone,
    email,
    bookingDate,
    startTime,
    durationHours,
    guests,
    accessLevel,
  } = data;

  const guestCount = guests ?? 1;

  // 1. Fetch lounge
  const lounge = await db.lounge.findUnique({ where: { id: loungeId } });
  if (!lounge) {
    throw new Error('Lounge not found');
  }

  // 2. Verify isOpen
  if (!lounge.isOpen) {
    throw new Error('Lounge is currently closed');
  }

  // 3. Verify capacity
  if (lounge.currentOccupancy + guestCount > lounge.maxCapacity) {
    throw new Error(
      `Insufficient capacity. Current occupancy: ${lounge.currentOccupancy}, ` +
        `Requested guests: ${guestCount}, Max capacity: ${lounge.maxCapacity}`,
    );
  }

  // 4. Calculate price
  const resolvedAccessLevel = accessLevel ?? 'standard';
  let totalPrice: number;
  const loungeName = lounge.name;
  const airportCode = lounge.airportCode;

  if (
    resolvedAccessLevel === 'business' &&
    lounge.priceBusiness !== null &&
    lounge.priceBusiness !== undefined
  ) {
    totalPrice = lounge.priceBusiness * guestCount;
  } else {
    totalPrice = lounge.priceStandard * guestCount;
  }

  // 5. Generate bookingRef: "LNG-" + lounge.name.substring(0,2).toUpperCase() + "-" + random 3 digits
  const prefix = lounge.name.substring(0, 2).toUpperCase();
  const randomDigits = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  const bookingRef = `LNG-${prefix}-${randomDigits}`;

  // 6. Create LoungeBooking in DB
  const booking = await db.loungeBooking.create({
    data: {
      loungeId,
      bookingRef,
      passengerName,
      phone,
      email: email ?? null,
      bookingDate,
      startTime,
      durationHours: durationHours ?? 2,
      guests: guestCount,
      loungeName: lounge.name,
      airportCode: lounge.airportCode,
      totalPrice,
      status: 'confirmed',
    },
  });

  // 7. Update lounge.currentOccupancy += guests
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
}

// ---------------------------------------------------------------------------
// Cancel a booking
// ---------------------------------------------------------------------------
export async function cancelBooking(bookingId: string) {
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

  // Update booking status
  const updatedBooking = await db.loungeBooking.update({
    where: { id: bookingId },
    data: { status: 'cancelled' },
  });

  // Decrement lounge.currentOccupancy
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
}

// ---------------------------------------------------------------------------
// Get bookings for a lounge
// ---------------------------------------------------------------------------
export async function getLoungeBookings(loungeId?: string, status?: string) {
  const where: Record<string, unknown> = {};

  if (loungeId) {
    where.loungeId = loungeId;
  }

  if (status) {
    where.status = status;
  }

  const bookings = await db.loungeBooking.findMany({
    where,
    include: {
      lounge: {
        select: {
          id: true,
          name: true,
          airportCode: true,
          location: true,
        },
      },
    },
    orderBy: { bookingDate: 'desc' },
  });

  return bookings;
}
