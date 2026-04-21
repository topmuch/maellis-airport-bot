# MAELLIS Airport Bot Service — Work Log: Phase 1 & Phase 2

**Task ID:** P1-P2  
**Date:** 2026-04-21  
**Version:** 2.0.0  
**Status:** ✅ Complete

---

## Summary

Complete rewrite of the MAELLIS Airport Bot Service from a single ~1060-line monolithic file into a properly structured modular TypeScript service with real API integrations and graceful fallbacks.

## Architecture Changes

### Before (v1.0.0)
- Single `index.ts` file (~1063 lines)
- Keyword-only intent classification
- Stub WhatsApp send (no real API)
- No flight data API
- No baggage QR generation
- No payment integration
- 4 endpoints

### After (v2.0.0)
- 9 modular TypeScript files
- Groq LLM intent classification with keyword fallback
- Real Meta WhatsApp Cloud API v18.0 integration
- AviationStack real flight data API
- JWT-signed baggage QR code generation (Web Crypto HMAC-SHA256)
- CinetPay payment link generation
- 9 endpoints

## File Structure

```
mini-services/bot-service/
├── index.ts                          # Main entry point, Bun.serve, 9 routes
├── package.json                      # v2.0.0, zero external deps
├── tsconfig.json                     # Strict TypeScript config
├── .env.example                      # All environment variables documented
└── src/
    ├── types.ts                      # 20+ TypeScript interfaces
    ├── airports.ts                   # 150+ airport codes, search/extract helpers
    ├── router.ts                     # Intent → response routing with service calls
    └── services/
        ├── whatsapp.service.ts       # Meta WhatsApp Cloud API v18.0
        ├── ai.service.ts             # Groq LLM + keyword fallback classifier
        ├── flight.service.ts         # AviationStack API + mock fallback
        ├── baggage.service.ts        # JWT QR code generation (Web Crypto)
        └── payment.service.ts        # CinetPay / Orange Money / Wave
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/webhook` | Meta WhatsApp webhook verification |
| POST | `/webhook` | Receive WhatsApp → AI → Service → Respond |
| GET | `/health` | Health check with service configuration status |
| POST | `/chat` | Test chat endpoint (returns JSON response) |
| GET | `/airports?q=` | Search 150+ airports by city name or IATA code |
| GET | `/track/:token` | Verify baggage QR JWT token |
| GET | `/flight/status/:number` | Get real-time flight status |
| POST | `/flight/search` | Search flights with date/passengers |
| POST | `/baggage/generate` | Generate JWT-signed baggage QR code |

## Phase 1: Real WhatsApp + Groq AI

### WhatsApp Service (`whatsapp.service.ts`)
- **sendWhatsAppMessage()**: Sends text and interactive messages via Meta Graph API v18.0
- **verifyWebhook()**: Handles Meta hub.challenge verification (GET)
- **parseWebhookPayload()**: Extracts phone, message text, type, and profile name from Meta webhook payloads
- Gracefully skips sends when `WHATSAPP_ACCESS_TOKEN` or `WHATSAPP_PHONE_ID` are not configured

### AI Service (`ai.service.ts`)
- **analyzeIntent()**: Primary entry — tries Groq LLM first, falls back to keywords
- **groqClassify()**: Uses Groq REST API (`llama3-8b-8192`) with `response_format: json_object` for structured intent classification with language detection, entity extraction, and confidence scoring
- **classifyByKeywords()**: Full keyword-based classifier preserved from v1.0.0 with all multilingual rules (French, English, Arabic, Wolof)
- **detectLanguage()**: Script-based Arabic detection + pattern-based Wolof/English/French detection
- **extractFlightNumber()**: Regex patterns for IATA flight numbers (2S221, AF123, etc.)
- **extractDate()**: French relative dates (demain), French month names, ISO dates, DD/MM/YYYY

## Phase 2: Business Modules

### Flight Service (`flight.service.ts`)
- **searchFlights()**: Real AviationStack API with departure/arrival IATA, date, and limit parameters; falls back to realistic mock data
- **getFlightStatus()**: Real-time flight status from AviationStack; mock fallback with random delay simulation
- Mock data includes realistic West African airlines (Air Sénégal, RwandAir, Ethiopian Airlines, Royal Air Maroc, Air Côte d'Ivoire)

### Baggage Service (`baggage.service.ts`)
- **generateBaggageQR()**: Creates HMAC-SHA256 signed JWT tokens using Bun's Web Crypto API (no external library)
- **verifyBaggageToken()**: Validates JWT signature, checks expiration, verifies token type
- **formatBaggageVerification()**: WhatsApp-formatted verification result
- 7-day token expiration with French date formatting

### Payment Service (`payment.service.ts`)
- **generatePaymentLink()**: Real CinetPay integration with proper URL parameters; mock fallback for development
- **getPaymentStatus()**: CinetPay payment status check API
- Multi-provider support: Orange Money (OM), Wave, CinetPay
- Provider labels and description helpers in French

### Router (`router.ts`)
- **generateResponse()**: Async response generator that calls appropriate services based on intent
- Flight search: resolves city names to IATA codes, calls AviationStack, formats results with emojis and status indicators
- Flight status: calls AviationStack with flight number, formats detailed status card
- Lounge/Transport: generates real payment links using CinetPay service
- All responses in French with multilingual support

## Technical Details

- **Zero external dependencies**: Uses only Bun built-in APIs (fetch, crypto)
- **Graceful fallback**: Every service works without API keys using mock data
- **TypeScript strict mode**: All interfaces properly typed in `types.ts`
- **Web Crypto**: JWT signing uses standard `crypto.subtle` for HMAC-SHA256
- **AbortSignal.timeout()**: 10-second timeout on external API calls
- **CORS**: Proper preflight handling on all endpoints

## Testing Results

All endpoints verified successfully:

- ✅ `/health` — Returns degraded status (no API keys), lists all service configs
- ✅ `POST /chat` — French greeting → intent: greeting, language: fr
- ✅ `POST /chat` — English greeting → intent: greeting, language: en
- ✅ `POST /chat` — Flight search "Dakar Abidjan" → intent: flight_search, real mock flight data (DSS→ABJ)
- ✅ `POST /chat` — Emergency "urgence sos" → intent: emergency
- ✅ `GET /webhook` — Verification returns challenge string
- ✅ `GET /airports?q=dakar` — Returns DSS code
- ✅ `GET /flight/status/2S221` — Returns mock flight status
- ✅ `POST /flight/search` — Returns 3 mock flights DSS→LOS
- ✅ `POST /baggage/generate` — Returns valid JWT token and tracking URL
- ✅ `GET /track/:token` — Verifies JWT, returns passenger data with ✅ Valide
- ✅ `POST /baggage/generate` (empty) — Returns validation error 400
- ✅ `GET /nonexistent` — Returns 404 with 9 endpoint list

## Configuration

All configuration via environment variables (see `.env.example`):
- `WHATSAPP_PHONE_ID` / `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_VERIFY_TOKEN`
- `GROQ_API_KEY`
- `AVIATION_STACK_KEY`
- `JWT_SECRET` / `PUBLIC_URL`
- `CINETPAY_API_KEY` / `CINETPAY_SITE_ID`
- `PORT` (default: 3005)
