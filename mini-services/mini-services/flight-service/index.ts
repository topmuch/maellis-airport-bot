// ============================================================================
// MAELLIS Flight Service — Bun HTTP Server (Port 3006)
// ============================================================================

import {
  getFlightStatus,
  searchFlights,
  searchAirportsService,
  isAviationStackConfigured,
  clearCache,
  getCacheStats,
} from "./src/flight.service";
import type { FlightSubscription } from "./src/types";

const PORT = 3006;
const startTime = Date.now();

// ---- In-memory Subscriptions ----

const subscriptions = new Map<string, FlightSubscription>();

// ---- CORS Headers ----

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || 'http://localhost:3001',
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
};

// ---- JSON Helper ----

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

// ---- Request Logger ----

function logRequest(method: string, path: string, status: number): void {
  console.log(`[FLIGHT-SVC] ${method} ${path} - ${status}`);
}

// ---- Router ----

const server = Bun.serve({
  port: PORT,
  fetch: async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname;

    // Handle CORS preflight
    if (method === "OPTIONS") {
      logRequest(method, path, 204);
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      // ---- GET /health ----
      if (method === "GET" && path === "/health") {
        const cacheStats = getCacheStats();
        const response = {
          success: true,
          service: "maellis-flight-service",
          version: "1.0.0",
          port: PORT,
          uptime: Math.round((Date.now() - startTime) / 1000),
          timestamp: new Date().toISOString(),
          aviationStack: {
            configured: isAviationStackConfigured(),
            keyPresent: !!process.env.AVIATION_STACK_KEY,
          },
          cache: cacheStats,
          subscriptions: subscriptions.size,
        };
        logRequest(method, path, 200);
        return jsonResponse(response);
      }

      // ---- POST /api/flight/status ----
      if (method === "POST" && path === "/api/flight/status") {
        const body = await req.json() as { flightNumber?: string; date?: string };

        if (!body.flightNumber || typeof body.flightNumber !== "string") {
          logRequest(method, path, 400);
          return jsonResponse(
            { success: false, error: "Missing required field: flightNumber" },
            400,
          );
        }

        const result = await getFlightStatus(body.flightNumber, body.date);
        logRequest(method, path, 200);
        return jsonResponse(result);
      }

      // ---- POST /api/flight/search ----
      if (method === "POST" && path === "/api/flight/search") {
        const body = await req.json() as Record<string, unknown>;

        const params = {
          departureCode: body.departureCode as string | undefined,
          arrivalCode: body.arrivalCode as string | undefined,
          date: body.date as string | undefined,
          flightNumber: body.flightNumber as string | undefined,
          timeFrom: body.timeFrom as string | undefined,
          timeTo: body.timeTo as string | undefined,
        };

        if (!params.departureCode && !params.flightNumber) {
          logRequest(method, path, 400);
          return jsonResponse(
            { success: false, error: "Provide at least departureCode or flightNumber" },
            400,
          );
        }

        const result = await searchFlights(params);
        logRequest(method, path, 200);
        return jsonResponse(result);
      }

      // ---- GET /api/airports?q=searchterm ----
      if (method === "GET" && path === "/api/airports") {
        const query = url.searchParams.get("q") || "";

        if (query.length < 1) {
          logRequest(method, path, 400);
          return jsonResponse(
            { success: false, error: "Query parameter 'q' is required (min 1 char)" },
            400,
          );
        }

        const results = searchAirportsService(query);
        logRequest(method, path, 200);
        return jsonResponse({ success: true, results, total: results.length });
      }

      // ---- POST /api/flight/subscribe ----
      if (method === "POST" && path === "/api/flight/subscribe") {
        const body = await req.json() as {
          flightNumber?: string;
          phone?: string;
          events?: string[];
        };

        if (!body.flightNumber || !body.phone) {
          logRequest(method, path, 400);
          return jsonResponse(
            { success: false, error: "Missing required fields: flightNumber, phone" },
            400,
          );
        }

        const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const subscription: FlightSubscription = {
          id,
          flightNumber: body.flightNumber.toUpperCase(),
          phone: body.phone,
          events: body.events || ["delay", "gate_change", "cancellation", "boarding"],
          createdAt: new Date().toISOString(),
        };

        subscriptions.set(id, subscription);
        logRequest(method, path, 201);
        return jsonResponse(
          { success: true, subscription, message: "Flight alert subscription created" },
          201,
        );
      }

      // ---- DELETE /api/cache ----
      if (method === "DELETE" && path === "/api/cache") {
        const authToken = req.headers.get("authorization")?.replace('Bearer ', '')
        if (!authToken || authToken !== process.env.FLIGHT_SERVICE_SECRET) {
          logRequest(method, path, 401);
          return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
        }

        const pattern = url.searchParams.get("pattern") || undefined;
        const statsBefore = getCacheStats();
        clearCache(pattern);
        const statsAfter = getCacheStats();

        logRequest(method, path, 200);
        return jsonResponse({
          success: true,
          message: pattern
            ? `Cleared cache entries matching '${pattern}'`
            : "All cache cleared",
          cleared: statsBefore.size - statsAfter.size,
          remaining: statsAfter.size,
        });
      }

      // ---- 404 Not Found ----
      logRequest(method, path, 404);
      return jsonResponse(
        {
          success: false,
          error: "Not Found",
          message: `Route ${method} ${path} does not exist`,
          availableRoutes: [
            "GET  /health",
            "POST /api/flight/status",
            "POST /api/flight/search",
            "GET  /api/airports?q=<search>",
            "POST /api/flight/subscribe",
            "DELETE /api/cache[?pattern=<str>]",
          ],
        },
        404,
      );
    } catch (err) {
      console.error(`[FLIGHT-SVC] Error processing ${method} ${path}:`, err);
      logRequest(method, path, 500);
      return jsonResponse(
        {
          success: false,
          error: "Internal Server Error",
          message: "Internal server error",
        },
        500,
      );
    }
  },
});

console.log(`[FLIGHT-SVC] ✈️  Flight service running on port ${PORT}`);
console.log(`[FLIGHT-SVC] AviationStack: ${isAviationStackConfigured() ? "configured ✅" : "mock mode ⚠️"}`);
console.log(`[FLIGHT-SVC] Routes:`);
console.log(`[FLIGHT-SVC]   GET  /health`);
console.log(`[FLIGHT-SVC]   POST /api/flight/status`);
console.log(`[FLIGHT-SVC]   POST /api/flight/search`);
console.log(`[FLIGHT-SVC]   GET  /api/airports?q=<search>`);
console.log(`[FLIGHT-SVC]   POST /api/flight/subscribe`);
console.log(`[FLIGHT-SVC]   DELETE /api/cache[?pattern=<str>]`);
