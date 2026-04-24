import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------

export interface CreateCheckInSessionInput {
  phone: string;
  passengerName?: string;
  flightNumber: string;
  airline?: string;
  pnr?: string;
  departureCode?: string;
  arrivalCode?: string;
  flightDate?: string;
  checkInUrl?: string;
  seat?: string;
  gate?: string;
  terminal?: string;
}

export interface CheckInLinkResult {
  airline: string;
  url: string | null;
  message: string;
}

// ---------------------------------------------------------------------------
// Airline check-in URL mapping
// ---------------------------------------------------------------------------
const AIRLINE_CHECKIN_URLS: Record<string, (pnr: string) => string> = {
  air_france: (pnr) => `https://www.airfrance.com/checkin?ref=${pnr}`,
  ethiopian: (pnr) =>
    `https://www.ethiopianairlines.com/checkin?pnr=${pnr}`,
  asky: (pnr) => `https://www.flyasky.com/checkin?pnr=${pnr}`,
};

// ---------------------------------------------------------------------------
// Helper: normalize airline name for URL lookup
// ---------------------------------------------------------------------------
function normalizeAirline(airline: string): string {
  const lower = airline.toLowerCase().trim();
  if (lower.includes('air france') || lower === 'af') return 'air_france';
  if (lower.includes('ethiopian') || lower === 'et') return 'ethiopian';
  if (lower.includes('asky') || lower === 'kp') return 'asky';
  return lower;
}

// ---------------------------------------------------------------------------
// 1. detectUpcomingFlights — Check TicketScan for flights within 48h
// ---------------------------------------------------------------------------
export async function detectUpcomingFlights(phone: string) {
  try {
    const now = new Date();
    const fortyEightHoursAgo = new Date(
      now.getTime() - 48 * 60 * 60 * 1000,
    );
    const fortyEightHoursAhead = new Date(
      now.getTime() + 48 * 60 * 60 * 1000,
    );

    const ticketScans = await db.ticketScan.findMany({
      where: {
        phone,
        status: { in: ['confirmed', 'pending'] },
        createdAt: {
          gte: fortyEightHoursAgo,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter scans with a flightDate that falls within the 48h window
    const upcomingFlights = ticketScans.filter((scan) => {
      if (!scan.flightDate) return true; // Include scans without explicit date (recently scanned)
      const flightDate = new Date(scan.flightDate);
      return (
        flightDate >= fortyEightHoursAgo && flightDate <= fortyEightHoursAhead
      );
    });

    return upcomingFlights;
  } catch (error) {
    console.error('[checkin.service] detectUpcomingFlights error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 2. generateCheckInLink — Generate check-in deep link based on airline
// ---------------------------------------------------------------------------
export function generateCheckInLink(
  pnr: string,
  airline: string,
): CheckInLinkResult {
  const key = normalizeAirline(airline);
  const urlBuilder = AIRLINE_CHECKIN_URLS[key];

  if (urlBuilder) {
    return {
      airline,
      url: urlBuilder(pnr),
      message: `✈️ Check-in en ligne disponible pour ${airline}`,
    };
  }

  return {
    airline,
    url: null,
    message: `Le check-in en ligne pour ${airline} n'est pas encore disponible via Smartly. Veuillez vous rendre sur le site officiel de la compagnie.`,
  };
}

// ---------------------------------------------------------------------------
// 3. createCheckInSession — Create a CheckInSession
// ---------------------------------------------------------------------------
export async function createCheckInSession(data: CreateCheckInSessionInput) {
  try {
    // Auto-generate check-in URL if airline and PNR are available
    let checkInUrl = data.checkInUrl ?? null;
    if (!checkInUrl && data.pnr && data.airline) {
      const linkResult = generateCheckInLink(data.pnr, data.airline);
      checkInUrl = linkResult.url;
    }

    const session = await db.checkInSession.create({
      data: {
        phone: data.phone,
        passengerName: data.passengerName ?? null,
        flightNumber: data.flightNumber,
        airline: data.airline ?? null,
        pnr: data.pnr ?? null,
        departureCode: data.departureCode ?? null,
        arrivalCode: data.arrivalCode ?? null,
        flightDate: data.flightDate ?? null,
        checkInUrl,
        seat: data.seat ?? null,
        gate: data.gate ?? null,
        terminal: data.terminal ?? null,
        status: 'detected',
      },
    });

    return session;
  } catch (error) {
    console.error('[checkin.service] createCheckInSession error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 4. getCheckInSessions — Get sessions for a user
// ---------------------------------------------------------------------------
export async function getCheckInSessions(phone: string) {
  try {
    const sessions = await db.checkInSession.findMany({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });

    return sessions;
  } catch (error) {
    console.error('[checkin.service] getCheckInSessions error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 5. updateCheckInStatus — Update session status and optional extra data
// ---------------------------------------------------------------------------
export async function updateCheckInStatus(
  id: string,
  status: string,
  extraData?: {
    boardingPassUrl?: string;
    seat?: string;
    gate?: string;
    terminal?: string;
    errorMessage?: string;
  },
) {
  try {
    // Verify session exists
    const existing = await db.checkInSession.findUnique({ where: { id } });
    if (!existing) {
      console.error(
        `[checkin.service] updateCheckInStatus: session not found: ${id}`,
      );
      return null;
    }

    const session = await db.checkInSession.update({
      where: { id },
      data: {
        status,
        ...(extraData?.boardingPassUrl !== undefined && {
          boardingPassUrl: extraData.boardingPassUrl,
        }),
        ...(extraData?.seat !== undefined && { seat: extraData.seat }),
        ...(extraData?.gate !== undefined && { gate: extraData.gate }),
        ...(extraData?.terminal !== undefined && {
          terminal: extraData.terminal,
        }),
        ...(extraData?.errorMessage !== undefined && {
          errorMessage: extraData.errorMessage,
        }),
      },
    });

    return session;
  } catch (error) {
    console.error('[checkin.service] updateCheckInStatus error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 6. getCheckInStats — Admin stats for check-in sessions
// ---------------------------------------------------------------------------
export async function getCheckInStats() {
  try {
    const [total, statusBreakdown, airlineBreakdown, recentSessions] =
      await Promise.all([
        db.checkInSession.count(),
        db.checkInSession.groupBy({
          by: ['status'],
          _count: { status: true },
        }),
        db.checkInSession.groupBy({
          by: ['airline'],
          _count: { airline: true },
        }),
        db.checkInSession.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

    return {
      totalSessions: total,
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count.status,
      })),
      airlineBreakdown: airlineBreakdown.map((a) => ({
        airline: a.airline,
        count: a._count.airline,
      })),
      sessionsLast7Days: recentSessions,
    };
  } catch (error) {
    console.error('[checkin.service] getCheckInStats error:', error);
    throw error;
  }
}
