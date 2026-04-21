// ============================================================================
// MAELLIS Airport Bot Service — Main Entry Point (Bun.serve)
// Phase 1: Real WhatsApp + Groq AI
// Phase 2: Business Modules (Flights, Baggage QR, Payments)
// Port: 3005
// ============================================================================

import { sendWhatsAppMessage, verifyWebhook, parseWebhookPayload, isWhatsAppConfigured } from "./src/services/whatsapp.service";
import { analyzeIntent, classifyByKeywords, isGroqConfigured } from "./src/services/ai.service";
import { searchFlights, getFlightStatus, isAviationStackConfigured } from "./src/services/flight.service";
import { generateBaggageQR, verifyBaggageToken, formatBaggageVerification } from "./src/services/baggage.service";
import { getPaymentStatus, isCinetPayConfigured } from "./src/services/payment.service";
import { generateResponse } from "./src/router";
import { AIRPORT_CODES, findAirportCode, searchAirports } from "./src/airports";

import type { ChatRequest, ChatResponse, HealthStatus, FlightSearchParams } from "./src/types";

// ---- Constants ----

const SERVICE_PORT = Number(process.env.PORT) || 3005;
const SERVICE_START_TIME = Date.now();
const SERVICE_VERSION = "2.0.0";

// ============================================================================
// HTTP Response Helpers
// ============================================================================

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function textResponse(text: string, status = 200) {
  return new Response(text, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

// ============================================================================
// Request Router
// ============================================================================

console.log("🚀 MAELLIS Airport Bot Service v" + SERVICE_VERSION + " starting...");
console.log(`📡 Port: ${SERVICE_PORT}`);

Bun.serve({
  port: SERVICE_PORT,

  async fetch(req: Request) {
    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname;

    // --- CORS preflight ---
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // ================================================================
    // GET /webhook — Meta WhatsApp webhook verification
    // ================================================================
    if (method === "GET" && path === "/webhook") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      const result = verifyWebhook(mode, token, challenge);

      if (result.verified) {
        return textResponse(result.challenge, 200);
      }

      return textResponse("Forbidden", 403);
    }

    // ================================================================
    // POST /webhook — Receive WhatsApp messages → AI → Respond
    // ================================================================
    if (method === "POST" && path === "/webhook") {
      try {
        const body = await req.json();
        console.log(
          "📩 Webhook payload received:",
          JSON.stringify(body).slice(0, 200),
        );

        const parsed = parseWebhookPayload(body);

        if (!parsed.phone) {
          console.log(
            "ℹ️  No message in webhook payload (possibly status update)",
          );
          return jsonResponse({ status: "ok" });
        }

        console.log(
          `📞 From: ${parsed.phone} | Type: ${parsed.messageType} | Text: ${parsed.messageText.slice(0, 80)}`,
        );

        // AI intent classification
        const aiResult = await analyzeIntent(parsed.messageText);
        console.log(
          `🎯 Intent: ${aiResult.intent} | Confidence: ${(aiResult.confidence * 100).toFixed(0)}% | Language: ${aiResult.language}`,
        );

        // Also run keyword classifier for entity extraction
        const classified = classifyByKeywords(parsed.messageText);

        // Generate response using the router
        const response = await generateResponse(aiResult, classified);

        // Send via WhatsApp API (fire-and-forget)
        sendWhatsAppMessage(parsed.phone, response).catch((err) => {
          console.error("❌ WhatsApp send error (non-blocking):", err);
        });

        return jsonResponse({
          status: "processed",
          intent: aiResult.intent,
          confidence: aiResult.confidence,
          language: aiResult.language,
          entities: classified.entities,
          messageType: parsed.messageType,
          profileName: parsed.profileName,
        });
      } catch (err) {
        console.error("❌ Error processing webhook:", err);
        return jsonResponse({ error: "Internal server error" }, 500);
      }
    }

    // ================================================================
    // GET /health — Health check with service status
    // ================================================================
    if (method === "GET" && path === "/health") {
      const uptime = Math.floor((Date.now() - SERVICE_START_TIME) / 1000);
      const health: HealthStatus = {
        status:
          isWhatsAppConfigured() && isGroqConfigured()
            ? "healthy"
            : "degraded",
        service: "maellis-bot",
        uptime,
        version: SERVICE_VERSION,
        port: SERVICE_PORT,
        timestamp: new Date().toISOString(),
        services: {
          whatsapp: isWhatsAppConfigured(),
          groq: isGroqConfigured(),
          aviationStack: isAviationStackConfigured(),
          cinetpay: isCinetPayConfigured(),
        },
      };
      return jsonResponse(health);
    }

    // ================================================================
    // POST /chat — Test chat endpoint (returns JSON)
    // ================================================================
    if (method === "POST" && path === "/chat") {
      try {
        const body = (await req.json()) as ChatRequest;
        const { message, phone } = body;

        if (!message || typeof message !== "string") {
          return jsonResponse(
            { error: "Field 'message' is required" },
            400,
          );
        }

        console.log(
          `💬 Chat test | Phone: ${phone ?? "anonymous"} | Message: ${message.slice(0, 80)}`,
        );

        // AI intent classification
        const aiResult = await analyzeIntent(message);
        console.log(
          `🎯 Intent: ${aiResult.intent} | Confidence: ${(aiResult.confidence * 100).toFixed(0)}% | Language: ${aiResult.language}`,
        );

        // Also run keyword classifier for entity extraction
        const classified = classifyByKeywords(message);

        // Generate response
        const response = await generateResponse(aiResult, classified);

        const chatResponse: ChatResponse = {
          intent: aiResult.intent,
          confidence: aiResult.confidence,
          language: aiResult.language,
          entities: classified.entities,
          aiEntities: aiResult.entities,
          response,
          timestamp: new Date().toISOString(),
        };

        return jsonResponse(chatResponse);
      } catch (err) {
        console.error("❌ Error processing chat:", err);
        return jsonResponse({ error: "Internal server error" }, 500);
      }
    }

    // ================================================================
    // GET /airports — Search airport codes
    // ================================================================
    if (method === "GET" && path === "/airports") {
      const search = url.searchParams.get("q")?.toLowerCase() || "";

      if (search) {
        const results = searchAirports(search);
        return jsonResponse({ results, count: results.length });
      }

      return jsonResponse({
        airports: AIRPORT_CODES,
        count: Object.keys(AIRPORT_CODES).length,
      });
    }

    // ================================================================
    // GET /track/:token — Verify baggage QR token
    // ================================================================
    if (method === "GET" && path.startsWith("/track/")) {
      const token = path.slice("/track/".length);

      if (!token) {
        return jsonResponse({ error: "Token is required" }, 400);
      }

      const verification = await verifyBaggageToken(token);

      if (!verification) {
        return jsonResponse(
          {
            error: "Token invalide ou expiré",
            valid: false,
          },
          404,
        );
      }

      return jsonResponse({
        valid: true,
        data: verification,
        message: formatBaggageVerification(verification),
      });
    }

    // ================================================================
    // GET /flight/status/:number — Get flight status
    // ================================================================
    if (method === "GET" && path.startsWith("/flight/status/")) {
      const flightNumber = path.slice("/flight/status/".length);

      if (!flightNumber) {
        return jsonResponse(
          { error: "Flight number is required" },
          400,
        );
      }

      const status = await getFlightStatus(flightNumber);
      return jsonResponse({
        flight: status,
        source: isAviationStackConfigured()
          ? "AviationStack API"
          : "mock data",
      });
    }

    // ================================================================
    // POST /flight/search — Search flights
    // ================================================================
    if (method === "POST" && path === "/flight/search") {
      try {
        const body = (await req.json()) as FlightSearchParams;

        if (!body.departureCode || !body.arrivalCode) {
          return jsonResponse(
            {
              error:
                "Fields 'departureCode' and 'arrivalCode' are required",
            },
            400,
          );
        }

        // Validate IATA codes (optionally resolve city names)
        let depCode = body.departureCode.toUpperCase();
        let arrCode = body.arrivalCode.toUpperCase();

        if (depCode.length > 3) {
          const resolved = findAirportCode(body.departureCode);
          if (resolved) depCode = resolved;
        }
        if (arrCode.length > 3) {
          const resolved = findAirportCode(body.arrivalCode);
          if (resolved) arrCode = resolved;
        }

        const flights = await searchFlights({
          departureCode: depCode,
          arrivalCode: arrCode,
          date: body.date,
          passengers: body.passengers,
        });

        return jsonResponse({
          flights,
          route: { from: depCode, to: arrCode },
          date: body.date || "demain",
          count: flights.length,
          source: isAviationStackConfigured()
            ? "AviationStack API"
            : "mock data",
        });
      } catch (err) {
        console.error("❌ Error searching flights:", err);
        return jsonResponse({ error: "Internal server error" }, 500);
      }
    }

    // ================================================================
    // POST /baggage/generate — Generate baggage QR code
    // ================================================================
    if (method === "POST" && path === "/baggage/generate") {
      try {
        const body = await req.json();

        const { passengerName, phone, flightNumber, pnr, destination } = body;

        if (!passengerName || !flightNumber || !destination) {
          return jsonResponse(
            {
              error:
                "Fields 'passengerName', 'flightNumber', and 'destination' are required",
            },
            400,
          );
        }

        const result = await generateBaggageQR({
          passengerName,
          phone: phone || "",
          flightNumber,
          pnr: pnr || `PNR_${Date.now()}`,
          destination,
        });

        return jsonResponse(result);
      } catch (err) {
        console.error("❌ Error generating baggage QR:", err);
        return jsonResponse({ error: "Internal server error" }, 500);
      }
    }

    // ================================================================
    // 404 — Not Found
    // ================================================================
    return jsonResponse(
      {
        error: "Not Found",
        service: "maellis-bot",
        version: SERVICE_VERSION,
        endpoints: [
          "GET  /webhook           — Meta verification",
          "POST /webhook           — Receive WhatsApp messages",
          "GET  /health            — Health check",
          "POST /chat              — Test chat endpoint",
          "GET  /airports?q=       — Search airports",
          "GET  /track/:token      — Verify baggage QR",
          "GET  /flight/status/:id — Flight status",
          "POST /flight/search     — Search flights",
          "POST /baggage/generate  — Generate baggage QR",
        ],
      },
      404,
    );
  },
});

console.log(
  `✅ MAELLIS Airport Bot Service v${SERVICE_VERSION} running on http://localhost:${SERVICE_PORT}`,
);
console.log("📡 Endpoints:");
console.log("   GET  /webhook           — Meta verification");
console.log("   POST /webhook           — Receive WhatsApp messages");
console.log("   GET  /health            — Health check");
console.log("   POST /chat              — Test chat endpoint");
console.log("   GET  /airports?q=       — Search airports");
console.log("   GET  /track/:token      — Verify baggage QR");
console.log("   GET  /flight/status/:id — Flight status");
console.log("   POST /flight/search     — Search flights");
console.log("   POST /baggage/generate  — Generate baggage QR");

// Service configuration status
console.log("\n🔧 Service Configuration:");
console.log(`   WhatsApp:  ${isWhatsAppConfigured() ? "✅ configured" : "⚠️  not configured"}`);
console.log(`   Groq AI:   ${isGroqConfigured() ? "✅ configured" : "⚠️  not configured (keyword fallback)"}`);
console.log(`   AviationStack: ${isAviationStackConfigured() ? "✅ configured" : "⚠️  not configured (mock data)"}`);
console.log(`   CinetPay:  ${isCinetPayConfigured() ? "✅ configured" : "⚠️  not configured (mock links)"}`);
