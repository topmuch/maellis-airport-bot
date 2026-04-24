// ============================================================================
// MAELLIS Airport Bot Service — Main Entry Point (Bun.serve)
// Phase 1: Real WhatsApp + Groq AI
// Phase 2: Business Modules (Flights, Baggage QR, Payments)
// Port: 3005
// ============================================================================

import { sendWhatsAppMessage, verifyWebhook, parseWebhookPayload, isWhatsAppConfigured, downloadWhatsAppMedia } from "./src/services/whatsapp.service";
import { analyzeImageWithOCR, formatOCRConfirmation, formatManualInputPrompt } from "./src/services/ocr.service";
import { analyzeIntent, classifyByKeywords, isGroqConfigured } from "./src/services/ai.service";
import { searchFlights, getFlightStatus, isAviationStackConfigured } from "./src/services/flight.service";
import { generateBaggageQR, verifyBaggageToken, formatBaggageVerification } from "./src/services/baggage.service";
import { getPaymentStatus, isCinetPayConfigured } from "./src/services/payment.service";
import { generateResponse } from "./src/router";
import { AIRPORT_CODES, findAirportCode, searchAirports } from "./src/airports";
import { checkRateLimit, extractIdentifier, rateLimitHeaders } from "./src/middleware/rate-limiter";
import { logger } from "./src/middleware/logger";

import type { ChatRequest, ChatResponse, HealthStatus, FlightSearchParams } from "./src/types";
import type { BotResponse } from "./src/types";

// ---- Constants ----

const SERVICE_PORT = Number(process.env.PORT) || 3005;
const SERVICE_START_TIME = Date.now();
const SERVICE_VERSION = "2.0.0";

// ============================================================================
// HTTP Response Helpers
// ============================================================================

function jsonResponse(data: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      ...extraHeaders,
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

logger.info("MAELLIS Airport Bot Service v" + SERVICE_VERSION + " starting...");
logger.info(`Port: ${SERVICE_PORT}`);

Bun.serve({
  port: SERVICE_PORT,

  async fetch(req: Request) {
    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname;
    const startTime = performance.now();

    // --- CORS preflight ---
    if (method === "OPTIONS") {
      const duration = Math.round(performance.now() - startTime);
      logger.request("OPTIONS", path, 204, duration);
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
        const duration = Math.round(performance.now() - startTime);
        logger.request("GET", path, 200, duration);
        return textResponse(result.challenge, 200);
      }

      const duration = Math.round(performance.now() - startTime);
      logger.request("GET", path, 403, duration);
      return textResponse("Forbidden", 403);
    }

    // ================================================================
    // POST /webhook — Receive WhatsApp messages → AI → Respond
    // ================================================================
    if (method === "POST" && path === "/webhook") {
      // Rate limiting
      const identifier = extractIdentifier(req);
      const rateLimitResult = checkRateLimit(identifier);

      if (!rateLimitResult.allowed) {
        const duration = Math.round(performance.now() - startTime);
        logger.warn(`Rate limited ${identifier} on POST /webhook`);
        logger.request("POST", path, 429, duration, identifier);
        return jsonResponse(
          { error: "Too Many Requests", retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000) },
          429,
          rateLimitHeaders(rateLimitResult),
        );
      }

      try {
        const body = await req.json();
        logger.info(
          "Webhook payload received",
          JSON.stringify(body).slice(0, 200),
        );

        const parsed = parseWebhookPayload(body);

        if (!parsed.phone) {
          logger.info("No message in webhook payload (possibly status update)");
          return jsonResponse(
            { status: "ok" },
            200,
            rateLimitHeaders(rateLimitResult),
          );
        }

        logger.info(
          `From: ${parsed.phone} | Type: ${parsed.messageType} | Text: ${parsed.messageText.slice(0, 80)}`,
        );

        // ──────────────────────────────────────────────────────────
        // IMAGE MESSAGE → OCR PIPELINE
        // If user sends an image, run OCR to extract boarding pass data
        // ──────────────────────────────────────────────────────────
        if (parsed.messageType === "image" && parsed.imageId) {
          logger.info(`📸 Image received from ${parsed.phone}, attempting OCR...`);

          try {
            // Download image from WhatsApp
            const imageData = await downloadWhatsAppMedia(parsed.imageId);

            if (imageData) {
              // Run OCR analysis
              const ocrResult = await analyzeImageWithOCR({
                imageData,
                phone: parsed.phone,
                source: "whatsapp",
              });

              let ocrResponse: BotResponse;

              if (ocrResult.success && ocrResult.data) {
                // Successful extraction — send confirmation with Yes/No buttons
                const confirmText = formatOCRConfirmation(ocrResult);
                ocrResponse = {
                  type: "interactive",
                  interactive: {
                    type: "button",
                    body: { text: confirmText },
                    action: {
                      buttons: [
                        { id: "ticket_confirm", title: "✅ Oui" },
                        { id: "ticket_reject", title: "❌ Non" },
                      ],
                    },
                  },
                };
              } else {
                // OCR failed — suggest manual input
                ocrResponse = {
                  type: "text",
                  text: ocrResult.message || formatManualInputPrompt(),
                };
              }

              // Send response via WhatsApp
              sendWhatsAppMessage(parsed.phone, ocrResponse).catch((err) => {
                logger.error("WhatsApp send error (OCR response)", String(err));
              });

              const duration = Math.round(performance.now() - startTime);
              logger.request("POST", path, 200, duration, identifier);

              return jsonResponse(
                {
                  status: "processed",
                  intent: "ticket_scan",
                  confidence: 1,
                  ocrSuccess: ocrResult.success,
                  ocrData: ocrResult.data
                    ? {
                        pnr: ocrResult.data.pnr,
                        flightNumber: ocrResult.data.flightNumber,
                        airline: ocrResult.data.airline,
                        confidence: ocrResult.data.confidence,
                      }
                    : null,
                  scanId: ocrResult.scanId,
                  messageType: parsed.messageType,
                  profileName: parsed.profileName,
                },
                200,
                rateLimitHeaders(rateLimitResult),
              );
            }
          } catch (ocrError) {
            logger.error("OCR pipeline error:", String(ocrError));
            // Fall through to normal text processing
          }
        }

        // ──────────────────────────────────────────────────────────
        // NORMAL TEXT MESSAGE → AI PIPELINE
        // ──────────────────────────────────────────────────────────
        // AI intent classification
        const aiResult = await analyzeIntent(parsed.messageText);
        logger.info(
          `Intent: ${aiResult.intent} | Confidence: ${(aiResult.confidence * 100).toFixed(0)}% | Language: ${aiResult.language}`,
        );

        // Also run keyword classifier for entity extraction
        const classified = classifyByKeywords(parsed.messageText);

        // Generate response using the router
        const response = await generateResponse(aiResult, classified);

        // Send via WhatsApp API (fire-and-forget)
        sendWhatsAppMessage(parsed.phone, response).catch((err) => {
          logger.error("WhatsApp send error (non-blocking)", String(err));
        });

        const duration = Math.round(performance.now() - startTime);
        logger.request("POST", path, 200, duration, identifier);

        return jsonResponse(
          {
            status: "processed",
            intent: aiResult.intent,
            confidence: aiResult.confidence,
            language: aiResult.language,
            entities: classified.entities,
            messageType: parsed.messageType,
            profileName: parsed.profileName,
          },
          200,
          rateLimitHeaders(rateLimitResult),
        );
      } catch (err) {
        const duration = Math.round(performance.now() - startTime);
        logger.error("Error processing webhook", String(err));
        logger.request("POST", path, 500, duration, identifier);
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
      const duration = Math.round(performance.now() - startTime);
      logger.request("GET", path, 200, duration);
      return jsonResponse(health);
    }

    // ================================================================
    // POST /chat — Test chat endpoint (returns JSON)
    // ================================================================
    if (method === "POST" && path === "/chat") {
      // Rate limiting
      const identifier = extractIdentifier(req);
      const rateLimitResult = checkRateLimit(identifier);

      if (!rateLimitResult.allowed) {
        const duration = Math.round(performance.now() - startTime);
        logger.warn(`Rate limited ${identifier} on POST /chat`);
        logger.request("POST", path, 429, duration, identifier);
        return jsonResponse(
          { error: "Too Many Requests", retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000) },
          429,
          rateLimitHeaders(rateLimitResult),
        );
      }

      try {
        const body = (await req.json()) as ChatRequest;
        const { message, phone } = body;

        if (!message || typeof message !== "string") {
          return jsonResponse(
            { error: "Field 'message' is required" },
            400,
          );
        }

        logger.info(
          `Chat test | Phone: ${phone ?? "anonymous"} | Message: ${message.slice(0, 80)}`,
        );

        // AI intent classification
        const aiResult = await analyzeIntent(message);
        logger.info(
          `Intent: ${aiResult.intent} | Confidence: ${(aiResult.confidence * 100).toFixed(0)}% | Language: ${aiResult.language}`,
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

        const duration = Math.round(performance.now() - startTime);
        logger.request("POST", path, 200, duration, identifier);

        return jsonResponse(chatResponse, 200, rateLimitHeaders(rateLimitResult));
      } catch (err) {
        const duration = Math.round(performance.now() - startTime);
        logger.error("Error processing chat", String(err));
        logger.request("POST", path, 500, duration, identifier);
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
        const duration = Math.round(performance.now() - startTime);
        logger.request("GET", path, 200, duration);
        return jsonResponse({ results, count: results.length });
      }

      const duration = Math.round(performance.now() - startTime);
      logger.request("GET", path, 200, duration);
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

      const duration = Math.round(performance.now() - startTime);
      logger.request("GET", path, 200, duration);
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
      const duration = Math.round(performance.now() - startTime);
      logger.request("GET", path, 200, duration);
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

        const duration = Math.round(performance.now() - startTime);
        logger.request("POST", path, 200, duration);
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
        const duration = Math.round(performance.now() - startTime);
        logger.error("Error searching flights", String(err));
        logger.request("POST", path, 500, duration);
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

        const duration = Math.round(performance.now() - startTime);
        logger.request("POST", path, 200, duration);
        return jsonResponse(result);
      } catch (err) {
        const duration = Math.round(performance.now() - startTime);
        logger.error("Error generating baggage QR", String(err));
        logger.request("POST", path, 500, duration);
        return jsonResponse({ error: "Internal server error" }, 500);
      }
    }

    // ================================================================
    // 404 — Not Found
    // ================================================================
    const duration = Math.round(performance.now() - startTime);
    logger.request(method, path, 404, duration);
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
          "POST /ocr/analyze       — OCR image analysis",
        ],
      },
      404,
    );
  },
});

logger.info(`MAELLIS Airport Bot Service v${SERVICE_VERSION} running on http://localhost:${SERVICE_PORT}`);
logger.info("Endpoints:");
logger.info("   GET  /webhook           — Meta verification");
logger.info("   POST /webhook           — Receive WhatsApp messages");
logger.info("   GET  /health            — Health check");
logger.info("   POST /chat              — Test chat endpoint");
logger.info("   GET  /airports?q=       — Search airports");
logger.info("   GET  /track/:token      — Verify baggage QR");
logger.info("   GET  /flight/status/:id — Flight status");
logger.info("   POST /flight/search     — Search flights");
logger.info("   POST /baggage/generate  — Generate baggage QR");
logger.info("   POST /ocr/analyze       — OCR image analysis");

// Service configuration status
logger.info("Service Configuration:");
logger.info(`   WhatsApp:  ${isWhatsAppConfigured() ? "configured" : "not configured"}`);
logger.info(`   Groq AI:   ${isGroqConfigured() ? "configured" : "not configured (keyword fallback)"}`);
logger.info(`   AviationStack: ${isAviationStackConfigured() ? "configured" : "not configured (mock data)"}`);
logger.info(`   CinetPay:  ${isCinetPayConfigured() ? "configured" : "not configured (mock links)"}`);
