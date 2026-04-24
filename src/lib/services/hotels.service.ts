import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------

export interface SearchDayUseParams {
  airportCode: string;
  date?: string;
  hours?: number;
  guests?: number;
  maxPrice?: number;
}

export interface CreateDayUseBookingInput {
  hotelId: string;
  roomId: string;
  passengerName: string;
  phone: string;
  email?: string;
  flightNumber?: string;
  bookingDate: string;
  startTime: string;
  durationHours?: number;
  guests?: number;
  paymentMethod?: string;
}

export interface HotelWithAvailability {
  id: string;
  airportCode: string;
  name: string;
  description: string | null;
  starRating: number;
  address: string;
  distanceKm: number;
  terminal: string;
  imageUrl: string | null;
  contactPhone: string;
  contactEmail: string;
  amenities: string;
  checkInTime: string;
  checkOutTime: string;
  rooms: {
    id: string;
    roomType: string;
    name: string;
    description: string | null;
    maxGuests: number;
    basePrice: number;
    hourPrice: number;
    minHours: number;
    maxHours: number;
    currency: string;
    availableRooms: number;
    amenities: string;
    imageUrl: string | null;
  }[];
}

// ---------------------------------------------------------------------------
// Public fields returned by list endpoints (no internal/admin fields leaked)
// ---------------------------------------------------------------------------
const PUBLIC_HOTEL_FIELDS = {
  id: true,
  airportCode: true,
  name: true,
  description: true,
  starRating: true,
  address: true,
  distanceKm: true,
  terminal: true,
  imageUrl: true,
  contactPhone: true,
  contactEmail: true,
  amenities: true,
  checkInTime: true,
  checkOutTime: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ---------------------------------------------------------------------------
// 1. getAvailableHotels — List hotels with available rooms for day-use
// ---------------------------------------------------------------------------
export async function getAvailableHotels(
  airportCode: string,
  date: string,
  hours: number = 4,
) {
  try {
    const hotels = await db.hotel.findMany({
      where: {
        airportCode: airportCode.toUpperCase(),
        isActive: true,
      },
      select: {
        ...PUBLIC_HOTEL_FIELDS,
        rooms: {
          where: {
            isActive: true,
            availableRooms: { gt: 0 },
            minHours: { lte: hours },
            maxHours: { gte: hours },
          },
          select: {
            id: true,
            roomType: true,
            name: true,
            description: true,
            maxGuests: true,
            basePrice: true,
            hourPrice: true,
            minHours: true,
            maxHours: true,
            currency: true,
            totalRooms: true,
            availableRooms: true,
            amenities: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { distanceKm: 'asc' },
    });

    // Filter out hotels with no available rooms matching the criteria
    const hotelsWithRooms = hotels.filter(
      (hotel) => hotel.rooms.length > 0,
    );

    return hotelsWithRooms;
  } catch (error) {
    console.error('[hotels.service] getAvailableHotels error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 2. searchDayUse — Search day-use hotels with optional filters
// ---------------------------------------------------------------------------
export async function searchDayUse(params: SearchDayUseParams) {
  try {
    const {
      airportCode,
      date,
      hours = 4,
      guests = 1,
      maxPrice,
    } = params;

    const where: Prisma.HotelWhereInput = {
      airportCode: airportCode.toUpperCase(),
      isActive: true,
      rooms: {
        some: {
          isActive: true,
          availableRooms: { gt: 0 },
          minHours: { lte: hours },
          maxHours: { gte: hours },
          ...(guests ? { maxGuests: { gte: guests } } : {}),
          ...(maxPrice ? { hourPrice: { lte: maxPrice } } : {}),
        },
      },
    };

    // If date provided, exclude hotels fully booked on that date
    // (we check room availability via booking overlap)
    const hotels = await db.hotel.findMany({
      where,
      select: {
        ...PUBLIC_HOTEL_FIELDS,
        rooms: {
          where: {
            isActive: true,
            availableRooms: { gt: 0 },
            minHours: { lte: hours },
            maxHours: { gte: hours },
            ...(guests ? { maxGuests: { gte: guests } } : {}),
            ...(maxPrice ? { hourPrice: { lte: maxPrice } } : {}),
          },
          select: {
            id: true,
            roomType: true,
            name: true,
            description: true,
            maxGuests: true,
            basePrice: true,
            hourPrice: true,
            minHours: true,
            maxHours: true,
            currency: true,
            totalRooms: true,
            availableRooms: true,
            amenities: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { distanceKm: 'asc' },
    });

    // If a date is provided, calculate remaining room availability
    // by subtracting active bookings on that date
    const hotelsWithAvailability = await Promise.all(
      hotels.map(async (hotel) => {
        if (!date) return hotel;

        const roomsWithAvail = await Promise.all(
          hotel.rooms.map(async (room) => {
            // Count active bookings for this room on the given date
            const bookedCount = await db.dayUseBooking.count({
              where: {
                roomId: room.id,
                bookingDate: date,
                status: {
                  in: ['confirmed', 'checked_in'],
                },
              },
            });

            const remaining = room.availableRooms - bookedCount;
            return {
              ...room,
              availableRooms: Math.max(0, remaining),
            };
          }),
        );

        // Filter out rooms with zero availability
        const availableRooms = roomsWithAvail.filter(
          (r) => r.availableRooms > 0,
        );

        return {
          ...hotel,
          rooms: availableRooms,
        };
      }),
    );

    // Filter out hotels with no available rooms
    const results = hotelsWithAvailability.filter(
      (hotel) => hotel.rooms.length > 0,
    );

    return results;
  } catch (error) {
    console.error('[hotels.service] searchDayUse error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 3. createDayUseBooking — Create a day-use hotel booking
// ---------------------------------------------------------------------------
export async function createDayUseBooking(data: CreateDayUseBookingInput) {
  try {
    const {
      hotelId,
      roomId,
      passengerName,
      phone,
      email,
      flightNumber,
      bookingDate,
      startTime,
      durationHours,
      guests,
      paymentMethod,
    } = data;

    const guestCount = guests ?? 1;
    const hours = durationHours ?? 4;

    // 1. Fetch the room
    const room = await db.hotelRoom.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new Error('Room not found');
    }

    // 2. Verify the room belongs to the specified hotel
    if (room.hotelId !== hotelId) {
      throw new Error('Room does not belong to the specified hotel');
    }

    // 3. Verify the room is active
    if (!room.isActive) {
      throw new Error('Room is currently unavailable');
    }

    // 4. Validate duration constraints
    if (hours < room.minHours) {
      throw new Error(
        `Minimum booking duration is ${room.minHours} hours for this room`,
      );
    }
    if (hours > room.maxHours) {
      throw new Error(
        `Maximum booking duration is ${room.maxHours} hours for this room`,
      );
    }

    // 5. Validate guest count
    if (guestCount > room.maxGuests) {
      throw new Error(
        `This room accommodates a maximum of ${room.maxGuests} guests`,
      );
    }

    // 6. Check availability on the booking date
    const bookedCount = await db.dayUseBooking.count({
      where: {
        roomId,
        bookingDate,
        status: {
          in: ['confirmed', 'checked_in'],
        },
      },
    });

    if (bookedCount >= room.availableRooms) {
      throw new Error(
        `No rooms available for ${bookingDate}. All ${room.availableRooms} rooms are booked.`,
      );
    }

    // 7. Calculate price
    const unitPrice = room.hourPrice * hours;
    const totalPrice = unitPrice;

    // 8. Generate bookingRef
    const bookingRef = `DU-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // 9. Fetch hotel name for denormalized storage
    const hotel = await db.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) {
      throw new Error('Hotel not found');
    }

    // 10. Create the booking
    const booking = await db.dayUseBooking.create({
      data: {
        hotelId,
        roomId,
        roomType: room.roomType,
        passengerName,
        phone,
        email: email ?? null,
        flightNumber: flightNumber ?? null,
        bookingDate,
        startTime,
        durationHours: hours,
        guests: guestCount,
        unitPrice: room.hourPrice,
        totalPrice,
        currency: room.currency,
        paymentMethod: paymentMethod ?? null,
        paymentStatus: 'pending',
        bookingRef,
        status: 'confirmed',
      },
    });

    // 11. Decrement available rooms
    await db.hotelRoom.update({
      where: { id: roomId },
      data: {
        availableRooms: {
          decrement: 1,
        },
      },
    });

    return booking;
  } catch (error) {
    console.error('[hotels.service] createDayUseBooking error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 4. getBookingByRef — Get a day-use booking by its reference
// ---------------------------------------------------------------------------
export async function getBookingByRef(ref: string) {
  try {
    const booking = await db.dayUseBooking.findUnique({
      where: { bookingRef: ref },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            airportCode: true,
            address: true,
            distanceKm: true,
            terminal: true,
            imageUrl: true,
            contactPhone: true,
            contactEmail: true,
          },
        },
      },
    });

    if (!booking) {
      console.error(
        `[hotels.service] Booking not found for ref: ${ref}`,
      );
      return null;
    }

    return booking;
  } catch (error) {
    console.error('[hotels.service] getBookingByRef error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 5. getUserBookings — Get all bookings for a user phone
// ---------------------------------------------------------------------------
export async function getUserBookings(phone: string) {
  try {
    const bookings = await db.dayUseBooking.findMany({
      where: { phone },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            airportCode: true,
            address: true,
            distanceKm: true,
            terminal: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings;
  } catch (error) {
    console.error('[hotels.service] getUserBookings error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 6. cancelBooking — Cancel a day-use booking by reference
// ---------------------------------------------------------------------------
export async function cancelBooking(ref: string, reason: string) {
  try {
    // Fetch the booking
    const booking = await db.dayUseBooking.findUnique({
      where: { bookingRef: ref },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === 'cancelled') {
      throw new Error('Booking is already cancelled');
    }

    if (booking.status === 'completed') {
      throw new Error('Cannot cancel a completed booking');
    }

    // Update booking status to cancelled
    const updatedBooking = await db.dayUseBooking.update({
      where: { bookingRef: ref },
      data: {
        status: 'cancelled',
        cancellationReason: reason ?? null,
        cancelledAt: new Date(),
      },
    });

    // Restore available rooms
    if (booking.roomId) {
      await db.hotelRoom.update({
        where: { id: booking.roomId },
        data: {
          availableRooms: {
            increment: 1,
          },
        },
      });
    }

    return updatedBooking;
  } catch (error) {
    console.error('[hotels.service] cancelBooking error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 7. getHotelStats — Admin stats (total bookings, revenue, popular hotels)
// ---------------------------------------------------------------------------
export async function getHotelStats(airportCode: string) {
  try {
    const totalHotels = await db.hotel.count({
      where: {
        airportCode: airportCode.toUpperCase(),
        isActive: true,
      },
    });

    const totalBookings = await db.dayUseBooking.count({
      where: {
        hotel: {
          airportCode: airportCode.toUpperCase(),
        },
      },
    });

    const activeBookings = await db.dayUseBooking.count({
      where: {
        hotel: {
          airportCode: airportCode.toUpperCase(),
        },
        status: {
          in: ['confirmed', 'checked_in'],
        },
      },
    });

    const cancelledBookings = await db.dayUseBooking.count({
      where: {
        hotel: {
          airportCode: airportCode.toUpperCase(),
        },
        status: 'cancelled',
      },
    });

    // Total revenue from paid bookings
    const revenueResult = await db.dayUseBooking.aggregate({
      _sum: { totalPrice: true },
      where: {
        hotel: {
          airportCode: airportCode.toUpperCase(),
        },
        paymentStatus: 'paid',
      },
    });

    const totalRevenue = revenueResult._sum.totalPrice ?? 0;

    // Average booking price
    const avgPriceResult = await db.dayUseBooking.aggregate({
      _avg: { totalPrice: true },
      where: {
        hotel: {
          airportCode: airportCode.toUpperCase(),
        },
        paymentStatus: 'paid',
      },
    });

    const avgBookingPrice = avgPriceResult._avg.totalPrice ?? 0;

    // Popular hotels (top 5 by booking count)
    const popularHotels = await db.dayUseBooking.groupBy({
      by: ['hotelId'],
      where: {
        hotel: {
          airportCode: airportCode.toUpperCase(),
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        totalPrice: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });

    // Enrich popular hotels with names
    const enrichedPopularHotels = await Promise.all(
      popularHotels.map(async (entry) => {
        const hotel = await db.hotel.findUnique({
          where: { id: entry.hotelId },
          select: { name: true, starRating: true },
        });
        return {
          hotelId: entry.hotelId,
          hotelName: hotel?.name ?? 'Unknown',
          starRating: hotel?.starRating ?? 0,
          bookingCount: entry._count.id,
          totalRevenue: entry._sum.totalPrice ?? 0,
        };
      }),
    );

    // Bookings by status breakdown
    const statusBreakdown = await db.dayUseBooking.groupBy({
      by: ['status'],
      where: {
        hotel: {
          airportCode: airportCode.toUpperCase(),
        },
      },
      _count: {
        id: true,
      },
    });

    return {
      totalHotels,
      totalBookings,
      activeBookings,
      cancelledBookings,
      totalRevenue,
      avgBookingPrice,
      popularHotels: enrichedPopularHotels,
      statusBreakdown: statusBreakdown.map((entry) => ({
        status: entry.status,
        count: entry._count.id,
      })),
    };
  } catch (error) {
    console.error('[hotels.service] getHotelStats error:', error);
    throw error;
  }
}
