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
  status?: string;
}

export interface CheckInLinkResult {
  airline: string;
  url: string | null;
  message: string;
}

// ---------------------------------------------------------------------------
// Airline seed data — 18 airlines serving West Africa / Dakar (DSS)
// ---------------------------------------------------------------------------
interface AirlineSeedEntry {
  iataCode: string;
  airlineName: string;
  checkinUrl: string;
  apiUrl?: string;
  notes?: string;
}

const AIRLINE_SEED_DATA: AirlineSeedEntry[] = [
  // ── West / Central African carriers ──────────────────────────────────────
  {
    iataCode: 'SN',
    airlineName: 'Air Sénégal',
    checkinUrl: 'https://www.air-senegal.com/check-in',
    notes: 'Flag carrier of Senegal. IATA "SN" also used by Brussels Airlines; this entry is for Air Sénégal.',
  },
  {
    iataCode: 'HC',
    airlineName: 'Air Côte d\'Ivoire',
    checkinUrl: 'https://www.aircotedivoire.com/en/check-in',
  },
  {
    iataCode: 'KP',
    airlineName: 'ASKY Airlines',
    checkinUrl: 'https://www.flyasky.com/check-in',
  },
  {
    iataCode: 'ET',
    airlineName: 'Ethiopian Airlines',
    checkinUrl: 'https://www.ethiopianairlines.com/check-in',
  },

  // ── North African carriers ───────────────────────────────────────────────
  {
    iataCode: 'AT',
    airlineName: 'Royal Air Maroc',
    checkinUrl: 'https://www.royalairmaroc.com/check-in',
  },
  {
    iataCode: 'TU',
    airlineName: 'Tunisair',
    checkinUrl: 'https://www.tunisair.com/en/check-in',
  },
  {
    iataCode: 'MS',
    airlineName: 'EgyptAir',
    checkinUrl: 'https://www.egyptair.com/check-in',
  },
  {
    iataCode: 'RJ',
    airlineName: 'Royal Jordanian',
    checkinUrl: 'https://www.rj.com/check-in',
  },

  // ── European legacy carriers ────────────────────────────────────────────
  {
    iataCode: 'AF',
    airlineName: 'Air France',
    checkinUrl: 'https://www.airfrance.com/check-in',
  },
  {
    iataCode: 'IB',
    airlineName: 'Iberia',
    checkinUrl: 'https://www.iberia.com/check-in',
  },
  {
    iataCode: 'LH',
    airlineName: 'Lufthansa',
    checkinUrl: 'https://www.lufthansa.com/check-in',
  },
  // Note: Brussels Airlines also uses IATA "SN". To disambiguate from Air
  // Sénégal we store it with a composite key-like code. The normalise
  // function handles the alias "brussels" or "sn_bru".
  {
    iataCode: 'SN_BRU',
    airlineName: 'Brussels Airlines',
    checkinUrl: 'https://www.brusselsairlines.com/check-in',
    notes: 'Uses SN_BRU to avoid collision with Air Sénégal (SN).',
  },

  // ── Middle-East & Gulf carriers ─────────────────────────────────────────
  {
    iataCode: 'TK',
    airlineName: 'Turkish Airlines',
    checkinUrl: 'https://www.turkishairlines.com/check-in',
  },
  {
    iataCode: 'EK',
    airlineName: 'Emirates',
    checkinUrl: 'https://www.emirates.com/check-in',
  },
  {
    iataCode: 'QR',
    airlineName: 'Qatar Airways',
    checkinUrl: 'https://www.qatarairways.com/check-in',
  },

  // ── Sub-Saharan African carriers ────────────────────────────────────────
  {
    iataCode: 'SA',
    airlineName: 'South African Airways',
    checkinUrl: 'https://www.flysaa.com/check-in',
  },

  // ── American carriers ───────────────────────────────────────────────────
  {
    iataCode: 'DL',
    airlineName: 'Delta Air Lines',
    checkinUrl: 'https://www.delta.com/check-in',
  },
  {
    iataCode: 'UA',
    airlineName: 'United Airlines',
    checkinUrl: 'https://www.united.com/check-in',
  },
];

// ---------------------------------------------------------------------------
// Hardcoded fallback airline check-in URL mapping (kept for backward compat)
// ---------------------------------------------------------------------------
const AIRLINE_CHECKIN_URLS: Record<string, (pnr: string) => string> = {
  air_france: (pnr) => `https://www.airfrance.com/checkin?ref=${pnr}`,
  ethiopian: (pnr) =>
    `https://www.ethiopianairlines.com/checkin?pnr=${pnr}`,
  asky: (pnr) => `https://www.flyasky.com/checkin?pnr=${pnr}`,
};

// ---------------------------------------------------------------------------
// Helper: normalize airline name / IATA code for URL lookup
// ---------------------------------------------------------------------------
function normalizeAirline(airline: string): string {
  const lower = airline.toLowerCase().trim();

  // Original 3 entries (backward-compatible)
  if (lower.includes('air france') || lower === 'af') return 'air_france';
  if (lower.includes('ethiopian') || lower === 'et') return 'ethiopian';
  if (lower.includes('asky') || lower === 'kp') return 'asky';

  // New airlines — return normalised key for DB / fallback lookup
  if (lower.includes('air senegal') || lower === 'sn') return 'sn';
  if (lower.includes('air cote') || lower.includes('air côte') || lower === 'hc') return 'hc';
  if (lower.includes('tunisair') || lower === 'tu') return 'tu';
  if (lower.includes('royal air maroc') || lower === 'at') return 'at';
  if (lower.includes('turkish') || lower === 'tk') return 'tk';
  if (lower.includes('emirates') || lower === 'ek') return 'ek';
  if (lower.includes('qatar') || lower === 'qr') return 'qr';
  if (lower.includes('iberia') || lower === 'ib') return 'ib';
  if (lower.includes('south african') || lower === 'saa' || lower === 'sa') return 'sa';
  if (lower.includes('delta') || lower === 'dl') return 'dl';
  if (lower.includes('united') || lower === 'ua') return 'ua';
  if (lower.includes('lufthansa') || lower === 'lh') return 'lh';
  if (lower.includes('brussels') || lower === 'sn_bru') return 'sn_bru';
  if (lower.includes('royal jordanian') || lower === 'rj') return 'rj';
  if (lower.includes('egyptair') || lower === 'ms') return 'ms';

  return lower;
}

// ---------------------------------------------------------------------------
// Seed function — upsert all known airlines into CheckinAirline table
// Called once at module load time if the table is empty.
// ---------------------------------------------------------------------------
let seedPromise: Promise<void> | null = null;

export async function seedCheckinAirlines(): Promise<void> {
  try {
    const count = await db.checkinAirline.count();
    if (count > 0) {
      console.log(
        `[checkin.service] seedCheckinAirlines: ${count} airlines already present, skipping seed.`,
      );
      return;
    }

    console.log(
      `[checkin.service] seedCheckinAirlines: table is empty, seeding ${AIRLINE_SEED_DATA.length} airlines…`,
    );

    for (const entry of AIRLINE_SEED_DATA) {
      await db.checkinAirline.upsert({
        where: { iataCode: entry.iataCode },
        update: {
          airlineName: entry.airlineName,
          checkinUrl: entry.checkinUrl,
          ...(entry.apiUrl !== undefined && { apiUrl: entry.apiUrl }),
          ...(entry.notes !== undefined && { notes: entry.notes }),
          isActive: true,
        },
        create: {
          id: crypto.randomUUID(),
          updatedAt: new Date(),
          iataCode: entry.iataCode,
          airlineName: entry.airlineName,
          checkinUrl: entry.checkinUrl,
          ...(entry.apiUrl !== undefined && { apiUrl: entry.apiUrl }),
          ...(entry.notes !== undefined && { notes: entry.notes }),
          isActive: true,
        },
      });
    }

    console.log(
      `[checkin.service] seedCheckinAirlines: ✅ seeded ${AIRLINE_SEED_DATA.length} airlines.`,
    );
  } catch (error) {
    console.error(
      '[checkin.service] seedCheckinAirlines error:',
      error,
    );
  }
}

// Fire-and-forget seed at module load. Silently skip if DB is unavailable (e.g. during build).
seedPromise = seedCheckinAirlines().catch(() => {
  // DB not available — expected during Next.js build
});

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
//     First checks the CheckinAirline DB table, then falls back to the
//     hardcoded AIRLINE_CHECKIN_URLS map.
// ---------------------------------------------------------------------------
export async function generateCheckInLink(
  pnr: string,
  airline: string,
): Promise<CheckInLinkResult> {
  const key = normalizeAirline(airline);

  // ── 2a. Try the database first ─────────────────────────────────────────
  try {
    // Ensure seed has completed before querying
    if (seedPromise) await seedPromise;

    const dbAirline = await db.checkinAirline.findUnique({
      where: { iataCode: key },
    });

    if (dbAirline && dbAirline.isActive && dbAirline.checkinUrl) {
      let url: string;
      if (dbAirline.checkinUrl.includes('{pnr}')) {
        // Template-style: remplacement direct du placeholder {pnr}
        url = dbAirline.checkinUrl.replace('{pnr}', pnr.trim().toUpperCase());
      } else {
        // Legacy-style: ajout du paramètre pnr en query string
        url = dbAirline.checkinUrl.includes('?')
          ? `${dbAirline.checkinUrl}&pnr=${encodeURIComponent(pnr)}`
          : `${dbAirline.checkinUrl}?pnr=${encodeURIComponent(pnr)}`;
      }

      // PNR masqué dans les logs (sécurité)
      const maskedPnr = pnr.length > 2 ? pnr.slice(0, 2) + '***' : pnr[0] + '***';
      console.info(
        `[checkin.service] generateCheckInLink: ✅ ${dbAirline.airlineName} (${key}) PNR=${maskedPnr} → ${url}`,
      );

      return {
        airline: dbAirline.airlineName,
        url,
        message: `✈️ Check-in en ligne disponible pour ${dbAirline.airlineName}`,
      };
    }
  } catch (error) {
    console.warn(
      '[checkin.service] generateCheckInLink: DB lookup failed, falling back to hardcoded map.',
      error,
    );
  }

  // ── 2b. Fallback to hardcoded map ─────────────────────────────────────
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
      const linkResult = await generateCheckInLink(data.pnr, data.airline);
      checkInUrl = linkResult.url;
    }

    const session = await db.checkInSession.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
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
        status: data.status ?? 'detected',
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
export async function getCheckInSessions(phone?: string) {
  try {
    const sessions = await db.checkInSession.findMany({
      where: phone ? { phone } : undefined,
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
