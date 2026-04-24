import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

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
  if (process.env.NODE_ENV === 'development') {
    console.error(`[rebooking.service] ${context}:`, message);
  }
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

const VALID_REBOOKING_STATUSES = [
  'detected',
  'notified',
  'accepted',
  'rejected',
  'expired',
] as const;

// ─── Zod Validation Schemas ──────────────────────────────────────────────

const iataCodeRegex = /^[A-Za-z]{2,4}$/;
const iataCodeSchema = z.string().regex(iataCodeRegex, 'Must be a valid IATA code (2-4 letters)').transform(v => v.toUpperCase());
const yyyyMmddRegex = /^\d{4}-\d{2}-\d{2}$/;
const dateSchema = z.string().regex(yyyyMmddRegex, 'Must be a valid date in YYYY-MM-DD format');

const createRebookingAlertSchema = z.object({
  phone: z.string().min(1, 'phone is required'),
  passengerName: z.string().max(200, 'passengerName must be at most 200 characters').optional(),
  originalFlight: z.string().min(1, 'originalFlight is required'),
  originalAirline: z.string().max(100).optional(),
  originalDepCode: z.string().max(10).optional(),
  originalArrCode: z.string().max(10).optional(),
  suggestedFlight: z.string().max(20).optional(),
  suggestedAirline: z.string().max(100).optional(),
  suggestedDepTime: z.string().max(50).optional(),
  suggestedPrice: z.number().min(0).optional(),
});

// ---------------------------------------------------------------------------
// 1. detectCancelledFlights — Check FlightStatus for cancelled flights
// ---------------------------------------------------------------------------
export async function detectCancelledFlights(airportCode: string) {
  try {
    // Zod validation
    const parsed = iataCodeSchema.safeParse(airportCode);
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`);
    }
    const validatedCode = parsed.data;

    const cancelledFlights = await db.flightStatus.findMany({
      where: {
        status: 'cancelled',
        OR: [
          { departureCode: validatedCode },
          { arrivalCode: validatedCode },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });

    return cancelledFlights;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Validation failed')) {
      throw error;
    }
    throw safeError(error, 'detectCancelledFlights');
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
    // Zod validation
    const depParsed = iataCodeSchema.safeParse(depCode);
    if (!depParsed.success) {
      throw new Error(`Validation failed: depCode - ${depParsed.error.issues.map(i => i.message).join(', ')}`);
    }
    const arrParsed = iataCodeSchema.safeParse(arrCode);
    if (!arrParsed.success) {
      throw new Error(`Validation failed: arrCode - ${arrParsed.error.issues.map(i => i.message).join(', ')}`);
    }
    const dateParsed = dateSchema.safeParse(date);
    if (!dateParsed.success) {
      throw new Error(`Validation failed: date - ${dateParsed.error.issues.map(i => i.message).join(', ')}`);
    }
    const validatedDep = depParsed.data;
    const validatedArr = arrParsed.data;
    const validatedDate = dateParsed.data;

    // Check for existing FlightStatus entries with the same route that are not cancelled
    const existingFlights = await db.flightStatus.findMany({
      where: {
        departureCode: validatedDep,
        arrivalCode: validatedArr,
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
        departureCode: validatedDep,
        arrivalCode: validatedArr,
        departureCity: 'Dakar',
        arrivalCity: 'Paris CDG',
        scheduledDep: `${validatedDate}T10:30:00`,
        scheduledArr: `${validatedDate}T18:45:00`,
        price: 385000,
        currency: 'XOF',
        seatsAvailable: 12,
      },
      {
        flightNumber: 'AF722',
        airline: 'Air France',
        departureCode: validatedDep,
        arrivalCode: validatedArr,
        departureCity: 'Dakar',
        arrivalCity: 'Paris CDG',
        scheduledDep: `${validatedDate}T23:15:00`,
        scheduledArr: `${validatedDate}T07:30:00`,
        price: 420000,
        currency: 'XOF',
        seatsAvailable: 8,
      },
      {
        flightNumber: 'SS721',
        airline: 'Corsair',
        departureCode: validatedDep,
        arrivalCode: validatedArr,
        departureCity: 'Dakar',
        arrivalCity: 'Paris ORY',
        scheduledDep: `${validatedDate}T21:00:00`,
        scheduledArr: `${validatedDate}T05:30:00`,
        price: 350000,
        currency: 'XOF',
        seatsAvailable: 15,
      },
      {
        flightNumber: 'TU604',
        airline: 'Tunisair',
        departureCode: validatedDep,
        arrivalCode: validatedArr,
        departureCity: 'Dakar',
        arrivalCity: 'Tunis',
        scheduledDep: `${validatedDate}T02:45:00`,
        scheduledArr: `${validatedDate}T07:00:00`,
        price: 280000,
        currency: 'XOF',
        seatsAvailable: 20,
      },
    ];

    // Filter by the requested departure code (mock routes only serve DSS for now)
    return mockAlternatives.filter(
      (f) => f.departureCode === validatedDep,
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Validation failed')) {
      throw error;
    }
    throw safeError(error, 'findAlternativeFlights');
  }
}

// ---------------------------------------------------------------------------
// 3. createRebookingAlert — Create a RebookingLog entry
// ---------------------------------------------------------------------------
export async function createRebookingAlert(
  data: CreateRebookingAlertInput,
) {
  try {
    // Zod validation
    const parsed = createRebookingAlertSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`);
    }
    const validatedData = parsed.data;

    // Validate inputs
    const safePhone = validatePhone(validatedData.phone, 'phone');
    const safeSuggestedPrice = validatedData.suggestedPrice !== undefined && validatedData.suggestedPrice !== null
      ? validateNonNegative(validatedData.suggestedPrice, 'suggestedPrice') : null;

    const rebookingLog = await db.rebookingLog.create({
      data: {
        phone: safePhone,
        passengerName: validatedData.passengerName ?? null,
        originalFlight: validatedData.originalFlight,
        originalAirline: validatedData.originalAirline ?? null,
        originalDepCode: validatedData.originalDepCode ?? null,
        originalArrCode: validatedData.originalArrCode ?? null,
        suggestedFlight: validatedData.suggestedFlight ?? null,
        suggestedAirline: validatedData.suggestedAirline ?? null,
        suggestedDepTime: validatedData.suggestedDepTime ?? null,
        suggestedPrice: safeSuggestedPrice,
        currency: 'XOF',
        status: 'detected',
      },
    });

    return rebookingLog;
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Validation failed') || error.message.startsWith('Invalid') || error.message.includes('must be'))) {
      throw error;
    }
    throw safeError(error, 'createRebookingAlert');
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
    throw safeError(error, 'getRebookingLogs');
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
    // Validate status against allowed values
    if (!VALID_REBOOKING_STATUSES.includes(status as typeof VALID_REBOOKING_STATUSES[number])) {
      throw new Error(
        `Invalid status '${status}'. Must be one of: ${VALID_REBOOKING_STATUSES.join(', ')}`,
      );
    }

    // Verify the log entry exists
    const existing = await db.rebookingLog.findUnique({ where: { id } });
    if (!existing) {
      if (process.env.NODE_ENV === 'development') {
        console.error(
          `[rebooking.service] updateRebookingStatus: log not found: ${id}`,
        );
      }
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
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.includes('Must be one of'))) {
      throw error;
    }
    throw safeError(error, 'updateRebookingStatus');
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
    throw safeError(error, 'getRebookingStats');
  }
}
