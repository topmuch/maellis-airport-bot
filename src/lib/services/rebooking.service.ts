import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------

export interface CreateRebookingAlertInput {
  phone: string;
  passengerName?: string;
  originalFlight: string;
  originalAirline?: string;
  originalDepCode?: string;
  originalArrCode?: string;
  suggestedFlight?: string;
  suggestedAirline?: string;
  suggestedDepTime?: string;
  suggestedPrice?: number;
}

export interface AlternativeFlight {
  flightNumber: string;
  airline: string;
  departureCode: string;
  arrivalCode: string;
  departureCity?: string;
  arrivalCity?: string;
  scheduledDep: string;
  scheduledArr: string;
  price: number;
  currency: string;
  seatsAvailable: number;
}

// ---------------------------------------------------------------------------
// 1. detectCancelledFlights — Check FlightStatus for cancelled flights
// ---------------------------------------------------------------------------
export async function detectCancelledFlights(airportCode: string) {
  try {
    const cancelledFlights = await db.flightStatus.findMany({
      where: {
        status: 'cancelled',
        OR: [
          { departureCode: airportCode.toUpperCase() },
          { arrivalCode: airportCode.toUpperCase() },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });

    return cancelledFlights;
  } catch (error) {
    console.error('[rebooking.service] detectCancelledFlights error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 2. findAlternativeFlights — Find alternative flights (mock data for now)
// ---------------------------------------------------------------------------
export async function findAlternativeFlights(
  depCode: string,
  arrCode: string,
  date: string,
): Promise<AlternativeFlight[]> {
  try {
    // Check for existing FlightStatus entries with the same route that are not cancelled
    const existingFlights = await db.flightStatus.findMany({
      where: {
        departureCode: depCode.toUpperCase(),
        arrivalCode: arrCode.toUpperCase(),
        status: {
          not: 'cancelled',
        },
      },
      orderBy: { scheduledDep: 'asc' },
    });

    // If we have real flight data, map it to the AlternativeFlight format
    if (existingFlights.length > 0) {
      return existingFlights.map((flight) => ({
        flightNumber: flight.flightNumber,
        airline: flight.airline,
        departureCode: flight.departureCode,
        arrivalCode: flight.arrivalCode,
        departureCity: flight.departureCity ?? undefined,
        arrivalCity: flight.arrivalCity ?? undefined,
        scheduledDep: flight.scheduledDep ?? '',
        scheduledArr: flight.scheduledArr ?? '',
        price: 0, // Price not available in FlightStatus
        currency: 'XOF',
        seatsAvailable: 0, // Seat count not available in FlightStatus
      }));
    }

    // Mock data fallback — realistic Senegal airline alternatives
    const mockAlternatives: AlternativeFlight[] = [
      {
        flightNumber: 'HC301',
        airline: 'Air Senegal',
        departureCode: depCode.toUpperCase(),
        arrivalCode: arrCode.toUpperCase(),
        departureCity: 'Dakar',
        arrivalCity: 'Paris CDG',
        scheduledDep: `${date}T10:30:00`,
        scheduledArr: `${date}T18:45:00`,
        price: 385000,
        currency: 'XOF',
        seatsAvailable: 12,
      },
      {
        flightNumber: 'AF722',
        airline: 'Air France',
        departureCode: depCode.toUpperCase(),
        arrivalCode: arrCode.toUpperCase(),
        departureCity: 'Dakar',
        arrivalCity: 'Paris CDG',
        scheduledDep: `${date}T23:15:00`,
        scheduledArr: `${date}T07:30:00`,
        price: 420000,
        currency: 'XOF',
        seatsAvailable: 8,
      },
      {
        flightNumber: 'SS721',
        airline: 'Corsair',
        departureCode: depCode.toUpperCase(),
        arrivalCode: arrCode.toUpperCase(),
        departureCity: 'Dakar',
        arrivalCity: 'Paris ORY',
        scheduledDep: `${date}T21:00:00`,
        scheduledArr: `${date}T05:30:00`,
        price: 350000,
        currency: 'XOF',
        seatsAvailable: 15,
      },
      {
        flightNumber: 'TU604',
        airline: 'Tunisair',
        departureCode: depCode.toUpperCase(),
        arrivalCode: arrCode.toUpperCase(),
        departureCity: 'Dakar',
        arrivalCity: 'Tunis',
        scheduledDep: `${date}T02:45:00`,
        scheduledArr: `${date}T07:00:00`,
        price: 280000,
        currency: 'XOF',
        seatsAvailable: 20,
      },
    ];

    // Filter by the requested departure code (mock routes only serve DSS for now)
    return mockAlternatives.filter(
      (f) => f.departureCode === depCode.toUpperCase(),
    );
  } catch (error) {
    console.error('[rebooking.service] findAlternativeFlights error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 3. createRebookingAlert — Create a RebookingLog entry
// ---------------------------------------------------------------------------
export async function createRebookingAlert(
  data: CreateRebookingAlertInput,
) {
  try {
    const rebookingLog = await db.rebookingLog.create({
      data: {
        phone: data.phone,
        passengerName: data.passengerName ?? null,
        originalFlight: data.originalFlight,
        originalAirline: data.originalAirline ?? null,
        originalDepCode: data.originalDepCode ?? null,
        originalArrCode: data.originalArrCode ?? null,
        suggestedFlight: data.suggestedFlight ?? null,
        suggestedAirline: data.suggestedAirline ?? null,
        suggestedDepTime: data.suggestedDepTime ?? null,
        suggestedPrice: data.suggestedPrice ?? null,
        currency: 'XOF',
        status: 'detected',
      },
    });

    return rebookingLog;
  } catch (error) {
    console.error('[rebooking.service] createRebookingAlert error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 4. getRebookingLogs — Get rebooking history, optionally filtered by phone
// ---------------------------------------------------------------------------
export async function getRebookingLogs(phone?: string) {
  try {
    const where: Prisma.RebookingLogWhereInput = {};

    if (phone) {
      where.phone = phone;
    }

    const logs = await db.rebookingLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return logs;
  } catch (error) {
    console.error('[rebooking.service] getRebookingLogs error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 5. updateRebookingStatus — Update status of a rebooking log entry
// ---------------------------------------------------------------------------
export async function updateRebookingStatus(
  id: string,
  status: string,
  response?: string,
) {
  try {
    // Verify the log entry exists
    const existing = await db.rebookingLog.findUnique({ where: { id } });
    if (!existing) {
      console.error(
        `[rebooking.service] updateRebookingStatus: log not found: ${id}`,
      );
      return null;
    }

    const updatedLog = await db.rebookingLog.update({
      where: { id },
      data: {
        status,
        ...(response !== undefined ? { response } : {}),
      },
    });

    return updatedLog;
  } catch (error) {
    console.error('[rebooking.service] updateRebookingStatus error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 6. getRebookingStats — Admin stats for rebooking module
// ---------------------------------------------------------------------------
export async function getRebookingStats() {
  try {
    const totalAlerts = await db.rebookingLog.count();

    const statusBreakdown = await db.rebookingLog.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    // Alerts from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentAlerts = await db.rebookingLog.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    // Alerts from the last 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const todayAlerts = await db.rebookingLog.count({
      where: {
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
    });

    // Most affected flights (by cancellation frequency)
    const affectedFlights = await db.rebookingLog.groupBy({
      by: ['originalFlight'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // Unique passengers impacted
    const uniquePassengers = await db.rebookingLog.groupBy({
      by: ['phone'],
      _count: {
        id: true,
      },
    });

    // Acceptance rate
    const acceptedCount = statusBreakdown.find(
      (s) => s.status === 'accepted',
    )?._count.id ?? 0;
    const rejectedCount = statusBreakdown.find(
      (s) => s.status === 'rejected',
    )?._count.id ?? 0;
    const respondedTotal = acceptedCount + rejectedCount;
    const acceptanceRate =
      respondedTotal > 0 ? (acceptedCount / respondedTotal) * 100 : 0;

    // Top airlines with cancellations
    const affectedAirlines = await db.rebookingLog.groupBy({
      by: ['originalAirline'],
      where: {
        originalAirline: { not: null },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });

    return {
      totalAlerts,
      recentAlerts,
      todayAlerts,
      acceptanceRate: Math.round(acceptanceRate * 100) / 100,
      statusBreakdown: statusBreakdown.map((entry) => ({
        status: entry.status,
        count: entry._count.id,
      })),
      affectedFlights: affectedFlights.map((entry) => ({
        flightNumber: entry.originalFlight,
        alertCount: entry._count.id,
      })),
      affectedAirlines: affectedAirlines.map((entry) => ({
        airline: entry.originalAirline,
        alertCount: entry._count.id,
      })),
      uniquePassengers: uniquePassengers.length,
    };
  } catch (error) {
    console.error('[rebooking.service] getRebookingStats error:', error);
    throw error;
  }
}
