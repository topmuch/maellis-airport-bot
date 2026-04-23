// ============================================================================
// MAELLIS Flight Service — AviationStack API + Mock Fallback
// ============================================================================
//
// NOTE: The FREE plan of AviationStack only returns "scheduled" flights.
// Real-time status (active, landed, delayed, cancelled, diverted) requires
// a paid subscription. This service falls back to realistic mock data when:
//   - No API key is configured
//   - API request fails or times out
//   - API returns empty results
// ============================================================================

import type {
  FlightStatusResponse,
  FlightSearchResponse,
  FlightNotification,
  FlightResult,
  AirportResult,
  FlightSearchParams,
} from "./types";
import { getCached, setCache, clearCache, getCacheStats } from "./cache";
import { findCityName, searchAirports as searchAirportsDB } from "./airports";

// ---- Config ----

const AVIATION_STACK_BASE = "http://api.aviationstack.com/v1";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

// ---- Date Helpers ----

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function formatDateISO(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

function buildMockISODate(dateStr: string, hour: number, minute: number): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d, hour, minute);
    return dt.toISOString();
  } catch {
    return `${dateStr}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`;
  }
}

// ---- AviationStack Configuration ----

export function isAviationStackConfigured(): boolean {
  return !!process.env.AVIATION_STACK_KEY;
}

// ---- Notification Generation ----

/**
 * Analyzes a flight's status and generates relevant notifications.
 * Rules:
 *   - Gate changes → medium priority
 *   - Delays > 15 min → high priority
 *   - Boarding within 30 min → medium priority
 *   - Cancellations → critical priority
 *   - Diversions → critical priority
 */
export function generateNotifications(flight: {
  status: string;
  delay?: number;
  gate?: string;
  departure?: { scheduled: string };
}): FlightNotification[] {
  const notifications: FlightNotification[] = [];
  const now = new Date();

  // Delay notification (> 15 minutes)
  if (flight.delay && flight.delay > 15) {
    notifications.push({
      type: "delay",
      message: `Flight delayed by ${flight.delay} minutes`,
      priority: flight.delay > 60 ? "critical" : "high",
      timestamp: now.toISOString(),
    });
  }

  // Cancellation
  if (flight.status === "cancelled") {
    notifications.push({
      type: "cancellation",
      message: "Flight has been cancelled",
      priority: "critical",
      timestamp: now.toISOString(),
    });
  }

  // Diversion
  if (flight.status === "diverted") {
    notifications.push({
      type: "diversion",
      message: "Flight has been diverted to an alternate airport",
      priority: "critical",
      timestamp: now.toISOString(),
    });
  }

  // Boarding soon (within 30 min of scheduled departure)
  if (flight.departure?.scheduled) {
    const depTime = new Date(flight.departure.scheduled);
    const minutesUntilDep = (depTime.getTime() - now.getTime()) / 60000;
    if (minutesUntilDep > 0 && minutesUntilDep <= 30) {
      notifications.push({
        type: "boarding",
        message: `Boarding begins in ${Math.ceil(minutesUntilDep)} minutes at gate ${flight.gate || "TBD"}`,
        priority: "medium",
        timestamp: now.toISOString(),
      });
    }
  }

  return notifications;
}

// ---- Flight Status ----

/**
 * Get real-time flight status. Checks cache first, then AviationStack API,
 * falls back to mock data.
 */
export async function getFlightStatus(
  flightNumber: string,
  date?: string,
): Promise<FlightStatusResponse> {
  const key = `status:${flightNumber.toUpperCase()}:${date || getTodayDate()}`;

  // Check cache
  const cached = getCached<FlightStatusResponse>(key);
  if (cached) {
    console.log(`[FLIGHT-SVC] Cache hit for flight status: ${key}`);
    return cached;
  }

  const apiKey = process.env.AVIATION_STACK_KEY;

  if (apiKey) {
    try {
      const searchParams = new URLSearchParams({
        access_key: apiKey,
        flight_iata: flightNumber.toUpperCase(),
        flight_date: date || getTodayDate(),
        limit: "1",
      });

      const url = `${AVIATION_STACK_BASE}/flights?${searchParams}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

      if (res.ok) {
        const data = await res.json();

        if (data.data?.length && !data.error) {
          const raw = data.data[0];
          const departure = raw.departure as Record<string, unknown>;
          const arrival = raw.arrival as Record<string, unknown>;
          const flight = raw.flight as Record<string, string>;
          const airline = raw.airline as Record<string, string>;

          const result: FlightStatusResponse = {
            success: true,
            flight: {
              iata: flight?.iata || flightNumber.toUpperCase(),
              airline: airline?.name || "Unknown",
              departure: {
                iata: (departure?.iata as string) || "N/A",
                city: findCityName((departure?.iata as string) || "") || undefined,
                terminal: (departure?.terminal as string) || "N/A",
                gate: (departure?.gate as string) || "N/A",
                scheduled: formatDateISO((departure?.scheduled as string) || ""),
                estimated: departure?.estimated ? formatDateISO(departure.estimated as string) : undefined,
                actual: departure?.actual ? formatDateISO(departure.actual as string) : undefined,
                delay: (departure?.delay as number) || undefined,
              },
              arrival: {
                iata: (arrival?.iata as string) || "N/A",
                city: findCityName((arrival?.iata as string) || "") || undefined,
                terminal: (arrival?.terminal as string) || "N/A",
                gate: (arrival?.gate as string) || "N/A",
                scheduled: formatDateISO((arrival?.scheduled as string) || ""),
                estimated: arrival?.estimated ? formatDateISO(arrival.estimated as string) : undefined,
                actual: arrival?.actual ? formatDateISO(arrival.actual as string) : undefined,
                delay: (arrival?.delay as number) || undefined,
              },
              status: (raw.flight_status as FlightStatusResponse["flight"]["status"]) || "scheduled",
              aircraft: (raw.aircraft as Record<string, string>)?.iata || undefined,
            },
          };

          result.notifications = generateNotifications({
            status: result.flight.status,
            delay: result.flight.arrival.delay,
            gate: result.flight.arrival.gate,
            departure: { scheduled: raw.departure?.scheduled as string },
          });

          setCache(key, result, CACHE_TTL_MS);
          return result;
        }
      } else {
        console.error(`[FLIGHT-SVC] AviationStack API error: ${res.status}`);
      }
    } catch (err) {
      console.error("[FLIGHT-SVC] AviationStack request failed:", err);
    }
  }

  // Fallback to mock
  console.log("[FLIGHT-SVC] Using mock flight status data");
  const result = getMockFlightStatus(flightNumber);
  setCache(key, result, CACHE_TTL_MS);
  return result;
}

// ---- Flight Search ----

/**
 * Search for flights. Supports:
 *   - By flight number: { flightNumber }
 *   - By route: { departureCode, arrivalCode, date? }
 *   - By time range: { departureCode, date?, timeFrom?, timeTo? }
 */
export async function searchFlights(params: FlightSearchParams): Promise<FlightSearchResponse> {
  const cacheKey = `search:${JSON.stringify(params)}`;
  const cached = getCached<FlightSearchResponse>(cacheKey);
  if (cached) {
    console.log(`[FLIGHT-SVC] Cache hit for flight search: ${cacheKey}`);
    return cached;
  }

  const apiKey = process.env.AVIATION_STACK_KEY;
  const query = {
    departureCode: params.departureCode || "",
    arrivalCode: params.arrivalCode,
    date: params.date || getTomorrowDate(),
    flightNumber: params.flightNumber,
  };

  if (apiKey) {
    try {
      const searchParams = new URLSearchParams({
        access_key: apiKey,
        flight_date: query.date,
        limit: "20",
      });

      if (params.flightNumber) {
        searchParams.set("flight_iata", params.flightNumber.toUpperCase());
      } else {
        if (params.departureCode) searchParams.set("dep_iata", params.departureCode.toUpperCase());
        if (params.arrivalCode) searchParams.set("arr_iata", params.arrivalCode.toUpperCase());
      }

      const url = `${AVIATION_STACK_BASE}/flights?${searchParams}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

      if (res.ok) {
        const data = await res.json();

        if (data.data?.length && !data.error) {
          const results = data.data.slice(0, 15).map((f: Record<string, unknown>) => {
            const dep = f.departure as Record<string, string>;
            const arr = f.arrival as Record<string, string>;
            const flight = f.flight as Record<string, string>;
            const airline = f.airline as Record<string, string>;

            const depTime = new Date(dep?.scheduled || "");
            const arrTime = new Date(arr?.scheduled || "");
            const duration = arrTime.getTime() - depTime.getTime();
            const delay = (arr?.delay as number) || 0;

            return {
              airline: airline?.name || "Unknown",
              flightNumber: flight?.iata || "N/A",
              departureCode: dep?.iata || "N/A",
              arrivalCode: arr?.iata || "N/A",
              departureCity: findCityName(dep?.iata || "") || undefined,
              arrivalCity: findCityName(arr?.iata || "") || undefined,
              departureTime: formatDateISO(dep?.scheduled || ""),
              arrivalTime: formatDateISO(arr?.scheduled || ""),
              departureTerminal: dep?.terminal || "N/A",
              arrivalTerminal: arr?.terminal || "N/A",
              departureGate: dep?.gate || "N/A",
              arrivalGate: arr?.gate || "N/A",
              status: (f.flight_status as string) || "scheduled",
              isDelayed: delay > 0,
              delayMinutes: delay,
              duration: duration > 0 ? Math.round(duration / 60000) : undefined,
              aircraft: (f.aircraft as Record<string, string>)?.iata || undefined,
            } satisfies FlightResult;
          });

          const response: FlightSearchResponse = {
            success: true,
            query,
            results,
            total: results.length,
            source: "aviationstack",
          };

          setCache(cacheKey, response, CACHE_TTL_MS);
          return response;
        }
      } else {
        console.error(`[FLIGHT-SVC] AviationStack API error: ${res.status}`);
      }
    } catch (err) {
      console.error("[FLIGHT-SVC] AviationStack request failed:", err);
    }
  }

  // Fallback to mock
  console.log("[FLIGHT-SVC] Using mock flight search data");
  const response = getMockSearchFlights(params);
  setCache(cacheKey, response, CACHE_TTL_MS);
  return response;
}

// ---- Airport Autocomplete ----

export function searchAirportsService(query: string): AirportResult[] {
  if (!query || query.length < 1) return [];
  const results = searchAirportsDB(query);
  return results.map((r) => ({
    city: r.city.charAt(0).toUpperCase() + r.city.slice(1),
    code: r.code,
  }));
}

// ---- Cache Management ----

export { clearCache, getCacheStats };

// ============================================================================
// MOCK DATA — Realistic African Airport Routes
// ============================================================================

interface MockFlightEntry {
  airline: string;
  flightNumber: string;
  departureCode: string;
  arrivalCode: string;
  depHour: number;
  depMinute: number;
  durationMinutes: number;
  status: string;
  delayMinutes: number;
  departureTerminal: string;
  arrivalTerminal: string;
  departureGate: string;
  arrivalGate: string;
  aircraft: string;
  price: number;
}

const MOCK_FLIGHTS: MockFlightEntry[] = [
  // Air Sénégal
  { airline: "Air Sénégal", flightNumber: "2S201", departureCode: "DSS", arrivalCode: "CDG", depHour: 0, depMinute: 30, durationMinutes: 330, status: "scheduled", delayMinutes: 0, departureTerminal: "A", arrivalTerminal: "2E", departureGate: "A1", arrivalGate: "K42", aircraft: "A330-900", price: 485000 },
  { airline: "Air Sénégal", flightNumber: "2S302", departureCode: "CDG", arrivalCode: "DSS", depHour: 12, depMinute: 15, durationMinutes: 315, status: "active", delayMinutes: 0, departureTerminal: "2E", arrivalTerminal: "A", departureGate: "K38", arrivalGate: "A3", aircraft: "A330-900", price: 520000 },
  { airline: "Air Sénégal", flightNumber: "2S110", departureCode: "DSS", arrivalCode: "ABJ", depHour: 8, depMinute: 0, durationMinutes: 150, status: "landed", delayMinutes: 0, departureTerminal: "A", arrivalTerminal: "D", departureGate: "A2", arrivalGate: "D5", aircraft: "A320neo", price: 195000 },
  { airline: "Air Sénégal", flightNumber: "2S115", departureCode: "DSS", arrivalCode: "BKO", depHour: 14, depMinute: 30, durationMinutes: 120, status: "delayed", delayMinutes: 35, departureTerminal: "A", arrivalTerminal: "A", departureGate: "A4", arrivalGate: "B2", aircraft: "A320neo", price: 165000 },

  // RwandAir
  { airline: "RwandAir", flightNumber: "WB301", departureCode: "KGL", arrivalCode: "NBO", depHour: 7, depMinute: 45, durationMinutes: 90, status: "scheduled", delayMinutes: 0, departureTerminal: "A", arrivalTerminal: "1A", departureGate: "G1", arrivalGate: "12", aircraft: "B737-800", price: 280000 },
  { airline: "RwandAir", flightNumber: "WB302", departureCode: "NBO", arrivalCode: "KGL", depHour: 16, depMinute: 0, durationMinutes: 85, status: "scheduled", delayMinutes: 0, departureTerminal: "1A", arrivalTerminal: "A", departureGate: "15", arrivalGate: "G2", aircraft: "B737-800", price: 275000 },

  // Ethiopian Airlines
  { airline: "Ethiopian Airlines", flightNumber: "ET507", departureCode: "ADD", arrivalCode: "NBO", depHour: 9, depMinute: 0, durationMinutes: 150, status: "active", delayMinutes: 0, departureTerminal: "2", arrivalTerminal: "1A", departureGate: "B4", arrivalGate: "8", aircraft: "B787-8", price: 340000 },
  { airline: "Ethiopian Airlines", flightNumber: "ET901", departureCode: "ADD", arrivalCode: "DSS", depHour: 22, depMinute: 45, durationMinutes: 420, status: "scheduled", delayMinutes: 0, departureTerminal: "2", arrivalTerminal: "A", departureGate: "A8", arrivalGate: "A5", aircraft: "B787-9", price: 510000 },
  { airline: "Ethiopian Airlines", flightNumber: "ET508", departureCode: "NBO", arrivalCode: "ADD", depHour: 18, depMinute: 30, durationMinutes: 155, status: "delayed", delayMinutes: 25, departureTerminal: "1A", arrivalTerminal: "2", departureGate: "14", arrivalGate: "B2", aircraft: "A350-900", price: 350000 },

  // Royal Air Maroc
  { airline: "Royal Air Maroc", flightNumber: "AT555", departureCode: "CMN", arrivalCode: "DSS", depHour: 10, depMinute: 15, durationMinutes: 180, status: "scheduled", delayMinutes: 0, departureTerminal: "1", arrivalTerminal: "A", departureGate: "C3", arrivalGate: "A6", aircraft: "B737-800", price: 225000 },
  { airline: "Royal Air Maroc", flightNumber: "AT500", departureCode: "BKO", arrivalCode: "CMN", depHour: 6, depMinute: 30, durationMinutes: 210, status: "active", delayMinutes: 0, departureTerminal: "A", arrivalTerminal: "1", departureGate: "B1", arrivalGate: "C1", aircraft: "B737-800", price: 198000 },
  { airline: "Royal Air Maroc", flightNumber: "AT200", departureCode: "CMN", arrivalCode: "CDG", depHour: 7, depMinute: 0, durationMinutes: 195, status: "landed", delayMinutes: 0, departureTerminal: "1", arrivalTerminal: "2E", departureGate: "A2", arrivalGate: "K30", aircraft: "B787-9", price: 380000 },

  // Air Côte d'Ivoire
  { airline: "Air Côte d'Ivoire", flightNumber: "HF710", departureCode: "ABJ", arrivalCode: "DSS", depHour: 11, depMinute: 0, durationMinutes: 140, status: "cancelled", delayMinutes: 0, departureTerminal: "D", arrivalTerminal: "A", departureGate: "D3", arrivalGate: "A7", aircraft: "E190", price: 185000 },
  { airline: "Air Côte d'Ivoire", flightNumber: "HF721", departureCode: "ABJ", arrivalCode: "ACC", depHour: 15, depMinute: 30, durationMinutes: 60, status: "scheduled", delayMinutes: 0, departureTerminal: "D", arrivalTerminal: "T2", departureGate: "D4", arrivalGate: "G3", aircraft: "E190", price: 120000 },

  // ASKY Airlines
  { airline: "ASKY Airlines", flightNumber: "KP20", departureCode: "LFW", arrivalCode: "OUA", depHour: 9, depMinute: 30, durationMinutes: 105, status: "scheduled", delayMinutes: 0, departureTerminal: "A", arrivalTerminal: "A", departureGate: "G1", arrivalGate: "G2", aircraft: "B737-700", price: 145000 },
  { airline: "ASKY Airlines", flightNumber: "KP41", departureCode: "LFW", arrivalCode: "ACC", depHour: 13, depMinute: 0, durationMinutes: 130, status: "delayed", delayMinutes: 90, departureTerminal: "A", arrivalTerminal: "T2", departureGate: "G3", arrivalGate: "G5", aircraft: "B737-800", price: 210000 },

  // Kenya Airways
  { airline: "Kenya Airways", flightNumber: "KQ501", departureCode: "NBO", arrivalCode: "JNB", depHour: 16, depMinute: 45, durationMinutes: 255, status: "scheduled", delayMinutes: 0, departureTerminal: "1A", arrivalTerminal: "A", departureGate: "18", arrivalGate: "A10", aircraft: "B787-8", price: 420000 },
  { airline: "Kenya Airways", flightNumber: "KQ304", departureCode: "NBO", arrivalCode: "DAR", depHour: 8, depMinute: 15, durationMinutes: 75, status: "active", delayMinutes: 0, departureTerminal: "1A", arrivalTerminal: "T1", departureGate: "10", arrivalGate: "G1", aircraft: "E190", price: 175000 },
];

function getMockSearchFlights(params: FlightSearchParams): FlightSearchResponse {
  const date = params.date || getTomorrowDate();
  let filtered = [...MOCK_FLIGHTS];

  // Filter by flight number
  if (params.flightNumber) {
    const fn = params.flightNumber.toUpperCase();
    filtered = filtered.filter((f) => f.flightNumber.toUpperCase() === fn);
  }

  // Filter by departure code
  if (params.departureCode) {
    const dep = params.departureCode.toUpperCase();
    filtered = filtered.filter((f) => f.departureCode === dep);
  }

  // Filter by arrival code
  if (params.arrivalCode) {
    const arr = params.arrivalCode.toUpperCase();
    filtered = filtered.filter((f) => f.arrivalCode === arr);
  }

  // Filter by time range
  if (params.timeFrom) {
    const fromH = parseInt(params.timeFrom.split(":")[0], 10);
    filtered = filtered.filter((f) => f.depHour >= fromH);
  }
  if (params.timeTo) {
    const toH = parseInt(params.timeTo.split(":")[0], 10);
    filtered = filtered.filter((f) => f.depHour <= toH);
  }

  // If no results after filtering, return all flights (simulating API fallback)
  if (filtered.length === 0 && params.flightNumber) {
    // Generate a dynamic mock for unknown flight numbers
    return {
      success: true,
      query: {
        departureCode: params.departureCode || "",
        arrivalCode: params.arrivalCode,
        date,
        flightNumber: params.flightNumber,
      },
      results: [generateDynamicMockFlight(params.flightNumber, date)],
      total: 1,
      source: "mock",
    };
  }

  if (filtered.length === 0) {
    filtered = MOCK_FLIGHTS.slice(0, 5);
  }

  const results: FlightResult[] = filtered.map((f) => {
    const depISO = buildMockISODate(date, f.depHour, f.depMinute);
    const arrISO = buildMockISODate(date, f.depHour, f.depMinute + f.durationMinutes);

    return {
      airline: f.airline,
      flightNumber: f.flightNumber,
      departureCode: f.departureCode,
      arrivalCode: f.arrivalCode,
      departureCity: findCityName(f.departureCode) || undefined,
      arrivalCity: findCityName(f.arrivalCode) || undefined,
      departureTime: formatDateISO(depISO),
      arrivalTime: formatDateISO(arrISO),
      departureTerminal: f.departureTerminal,
      arrivalTerminal: f.arrivalTerminal,
      departureGate: f.departureGate,
      arrivalGate: f.arrivalGate,
      status: f.status,
      isDelayed: f.delayMinutes > 0,
      delayMinutes: f.delayMinutes,
      duration: f.durationMinutes,
      aircraft: f.aircraft,
      price: f.price,
    };
  });

  return {
    success: true,
    query: {
      departureCode: params.departureCode || "",
      arrivalCode: params.arrivalCode,
      date,
      flightNumber: params.flightNumber,
    },
    results,
    total: results.length,
    source: "mock",
  };
}

function generateDynamicMockFlight(flightNumber: string, date: string): FlightResult {
  const now = new Date();
  const depTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const arrTime = new Date(depTime.getTime() + 2.5 * 60 * 60 * 1000);
  const isDelayed = Math.random() > 0.7;
  const delay = isDelayed ? 15 + Math.floor(Math.random() * 60) : 0;

  return {
    airline: "Air Sénégal",
    flightNumber: flightNumber.toUpperCase(),
    departureCode: "DSS",
    arrivalCode: "ABJ",
    departureCity: "dakar",
    arrivalCity: "abidjan",
    departureTime: formatDateISO(depTime.toISOString()),
    arrivalTime: formatDateISO(arrTime.toISOString()),
    departureTerminal: "A",
    arrivalTerminal: "D",
    departureGate: "G4",
    arrivalGate: "D5",
    status: isDelayed ? "delayed" : "scheduled",
    isDelayed,
    delayMinutes: delay,
    duration: 150,
    aircraft: "A320neo",
    price: 195000,
  };
}

function getMockFlightStatus(flightNumber: string): FlightStatusResponse {
  const fn = flightNumber.toUpperCase();
  const now = new Date();

  // Check if it matches one of our mock flights
  const found = MOCK_FLIGHTS.find(
    (f) => f.flightNumber.toUpperCase() === fn,
  );

  if (found) {
    const depISO = buildMockISODate(getTodayDate(), found.depHour, found.depMinute);
    const arrISO = buildMockISODate(
      getTodayDate(),
      found.depHour,
      found.depMinute + found.durationMinutes,
    );
    const delay = found.delayMinutes;

    const response: FlightStatusResponse = {
      success: true,
      flight: {
        iata: found.flightNumber,
        airline: found.airline,
        departure: {
          iata: found.departureCode,
          city: findCityName(found.departureCode) || undefined,
          terminal: found.departureTerminal,
          gate: found.departureGate,
          scheduled: formatDateISO(depISO),
          estimated: delay > 0 ? formatDateISO(new Date(new Date(depISO).getTime() + delay * 60000).toISOString()) : undefined,
          delay: delay > 0 ? delay : undefined,
        },
        arrival: {
          iata: found.arrivalCode,
          city: findCityName(found.arrivalCode) || undefined,
          terminal: found.arrivalTerminal,
          gate: found.arrivalGate,
          scheduled: formatDateISO(arrISO),
          estimated: delay > 0 ? formatDateISO(new Date(new Date(arrISO).getTime() + delay * 60000).toISOString()) : undefined,
          delay: delay > 0 ? delay : undefined,
        },
        status: found.status as FlightStatusResponse["flight"]["status"],
        aircraft: found.aircraft,
      },
    };

    response.notifications = generateNotifications({
      status: found.status,
      delay: found.delayMinutes,
      gate: found.arrivalGate,
      departure: { scheduled: depISO },
    });

    return response;
  }

  // Dynamic fallback for unknown flight numbers
  const depTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const arrTime = new Date(depTime.getTime() + 2.5 * 60 * 60 * 1000);
  const isDelayed = Math.random() > 0.7;
  const delay = isDelayed ? 20 + Math.floor(Math.random() * 40) : 0;

  const response: FlightStatusResponse = {
    success: true,
    flight: {
      iata: fn,
      airline: "Air Sénégal",
      departure: {
        iata: "DSS",
        city: "dakar",
        terminal: "A",
        gate: "G4",
        scheduled: formatDateISO(depTime.toISOString()),
        estimated: isDelayed ? formatDateISO(new Date(depTime.getTime() + delay * 60000).toISOString()) : undefined,
        delay: isDelayed ? delay : undefined,
      },
      arrival: {
        iata: "ABJ",
        city: "abidjan",
        terminal: "D",
        gate: "D5",
        scheduled: formatDateISO(arrTime.toISOString()),
        estimated: isDelayed ? formatDateISO(new Date(arrTime.getTime() + delay * 60000).toISOString()) : undefined,
        delay: isDelayed ? delay : undefined,
      },
      status: isDelayed ? "delayed" : "scheduled",
      aircraft: "A320neo",
    },
  };

  response.notifications = generateNotifications({
    status: isDelayed ? "delayed" : "scheduled",
    delay: isDelayed ? delay : undefined,
    gate: "D5",
    departure: { scheduled: depTime.toISOString() },
  });

  return response;
}
