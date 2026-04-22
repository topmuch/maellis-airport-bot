// ============================================================================
// MAELLIS Airport Bot — Flight Service (AviationStack API + Mock Fallback)
// ============================================================================

import type { FlightSearchParams, FlightResult, FlightStatusResult } from "../types";

const AVIATION_STACK_BASE = "http://api.aviationstack.com/v1";

// ---- Date Helpers ----

function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
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

// ---- Flight Search ----

/**
 * Search for flights using AviationStack API.
 * Falls back to mock data when API key is not configured or API fails.
 */
export async function searchFlights(params: FlightSearchParams): Promise<FlightResult[]> {
  const apiKey = process.env.AVIATION_STACK_KEY;

  if (!apiKey) {
    console.log("⚠️  AVIATION_STACK_KEY not set — using mock flight data");
    return getMockFlights(params);
  }

  try {
    const searchParams = new URLSearchParams({
      access_key: apiKey,
      dep_iata: params.departureCode,
      arr_iata: params.arrivalCode,
      flight_date: params.date || getTomorrowDate(),
      limit: "10",
    });

    const url = `${AVIATION_STACK_BASE}/flights?${searchParams}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!res.ok) {
      console.error(`❌ AviationStack API error: ${res.status}`);
      return getMockFlights(params);
    }

    const data = await res.json();

    if (data.error) {
      console.error("❌ AviationStack API error:", data.error);
      return getMockFlights(params);
    }

    if (!data.data?.length) {
      console.log("ℹ️  No flights found from AviationStack, using mock data");
      return getMockFlights(params);
    }

    return data.data.slice(0, 5).map((flight: Record<string, unknown>) => ({
      airline: (flight.airline as Record<string, string>)?.name || "Unknown",
      flightNumber: (flight.flight as Record<string, string>)?.iata || "N/A",
      departureTime: formatDate(
        (flight.departure as Record<string, string>)?.scheduled || ""
      ),
      arrivalTime: formatDate(
        (flight.arrival as Record<string, string>)?.scheduled || ""
      ),
      departureTerminal: (flight.departure as Record<string, string>)?.terminal || "N/A",
      arrivalTerminal: (flight.arrival as Record<string, string>)?.terminal || "N/A",
      departureGate: (flight.departure as Record<string, string>)?.gate || "N/A",
      arrivalGate: (flight.arrival as Record<string, string>)?.gate || "N/A",
      status: (flight as Record<string, string>)?.flight_status || "scheduled",
      isDelayed:
        (flight.arrival as Record<string, number>)?.delay !== undefined &&
        (flight.arrival as Record<string, number>).delay > 0,
      delayMinutes: (flight.arrival as Record<string, number>)?.delay || 0,
    }));
  } catch (err) {
    console.error("❌ AviationStack request failed:", err);
    return getMockFlights(params);
  }
}

// ---- Flight Status ----

/**
 * Get real-time flight status using AviationStack API.
 * Falls back to mock data when API key is not configured or API fails.
 */
export async function getFlightStatus(flightNumber: string): Promise<FlightStatusResult> {
  const apiKey = process.env.AVIATION_STACK_KEY;

  if (!apiKey) {
    console.log("⚠️  AVIATION_STACK_KEY not set — using mock flight status");
    return getMockFlightStatus(flightNumber);
  }

  try {
    const searchParams = new URLSearchParams({
      access_key: apiKey,
      flight_iata: flightNumber.toUpperCase(),
      limit: "1",
    });

    const url = `${AVIATION_STACK_BASE}/flights?${searchParams}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!res.ok) {
      console.error(`❌ AviationStack API error: ${res.status}`);
      return getMockFlightStatus(flightNumber);
    }

    const data = await res.json();

    if (!data.data?.length) {
      console.log("ℹ️  Flight not found from AviationStack, using mock data");
      return getMockFlightStatus(flightNumber);
    }

    const flight = data.data[0];
    return {
      flightNumber: (flight.flight as Record<string, string>)?.iata || flightNumber,
      airline: (flight.airline as Record<string, string>)?.name || "Unknown",
      origin: (flight.departure as Record<string, string>)?.iata || "N/A",
      destination: (flight.arrival as Record<string, string>)?.iata || "N/A",
      departureTime: formatDate(
        (flight.departure as Record<string, string>)?.scheduled || ""
      ),
      arrivalTime: formatDate(
        (flight.arrival as Record<string, string>)?.scheduled || ""
      ),
      status: (flight as Record<string, string>)?.flight_status || "scheduled",
      isDelayed:
        (flight.arrival as Record<string, number>)?.delay !== undefined &&
        (flight.arrival as Record<string, number>).delay > 0,
      delayMinutes: (flight.arrival as Record<string, number>)?.delay || 0,
      gate: (flight.arrival as Record<string, string>)?.gate || undefined,
      terminal: (flight.arrival as Record<string, string>)?.terminal || undefined,
    };
  } catch (err) {
    console.error("❌ AviationStack request failed:", err);
    return getMockFlightStatus(flightNumber);
  }
}

// ---- Mock Data ----

function getMockFlights(params: FlightSearchParams): FlightResult[] {
  const date = params.date || getTomorrowDate();

  const airlines = [
    { name: "Air Sénégal", prefix: "2S" },
    { name: "RwandAir", prefix: "WB" },
    { name: "Ethiopian Airlines", prefix: "ET" },
    { name: "Royal Air Maroc", prefix: "AT" },
    { name: "Air Côte d'Ivoire", prefix: "HF" },
  ];

  const hours = [6, 8, 10, 12, 14, 16, 18, 20];
  const selected = airlines.slice(0, 3 + Math.floor(Math.random() * 3));

  return selected.map((airline, i) => {
    const depHour = hours[(i * 2) % hours.length];
    const arrHour = depHour + 2 + Math.floor(Math.random() * 3);
    const isDelayed = Math.random() > 0.75;
    const delayMinutes = isDelayed ? 15 + Math.floor(Math.random() * 60) : 0;
    const statuses: Array<string> = ["scheduled", "active", "landed", "scheduled"];
    const status = statuses[i % statuses.length];

    return {
      airline: airline.name,
      flightNumber: `${airline.prefix}${100 + Math.floor(Math.random() * 900)}`,
      departureTime: formatDateForMock(date, depHour, Math.floor(Math.random() * 60)),
      arrivalTime: formatDateForMock(date, arrHour, Math.floor(Math.random() * 60)),
      departureTerminal: "A",
      arrivalTerminal: ["A", "B", "C"][i % 3],
      departureGate: `G${1 + (i % 8)}`,
      arrivalGate: `G${1 + ((i + 3) % 8)}`,
      status: isDelayed ? "delayed" : status,
      isDelayed,
      delayMinutes,
    };
  });
}

function getMockFlightStatus(flightNumber: string): FlightStatusResult {
  const now = new Date();
  const depTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const arrTime = new Date(depTime.getTime() + 2.5 * 60 * 60 * 1000);
  const isDelayed = Math.random() > 0.7;

  return {
    flightNumber: flightNumber.toUpperCase(),
    airline: "Air Sénégal",
    origin: "DSS",
    destination: "ABJ",
    departureTime: formatDate(depTime.toISOString()),
    arrivalTime: formatDate(arrTime.toISOString()),
    status: isDelayed ? "delayed" : "scheduled",
    isDelayed,
    delayMinutes: isDelayed ? 20 + Math.floor(Math.random() * 40) : 0,
    gate: "G4",
    terminal: "A",
  };
}

function formatDateForMock(dateStr: string, hour: number, minute: number): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d, hour, minute);
    return dt.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return `${dateStr} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
}

/**
 * Check if AviationStack API key is configured.
 */
export function isAviationStackConfigured(): boolean {
  return !!process.env.AVIATION_STACK_KEY;
}
