# Worklog — Task P-API: Dashboard API Routes for Bot Service Integration

**Date:** 2025-01-20  
**Task ID:** P-API  
**Agent:** main  

---

## Summary

Updated and created 6 API routes under `/api/bot/` to support real bot service integration (port 3005). All routes include proxy forwarding to the bot service with graceful fallback to mock data when the bot service is unavailable. Conversation data is persisted to the SQLite database via Prisma.

---

## Files Modified

### 1. UPDATED: `src/app/api/bot/chat/route.ts`
**Changes:**
- Added `import { db } from '@/lib/db'` for database access
- Added `storeConversation()` async helper that:
  - Upserts a `Conversation` record by phone number (using `id: ${phone}-default` as upsert key)
  - Creates an `incoming` `Message` for the user's message
  - Creates an `outgoing` `Message` for the bot's response with intent, entities, and responseTime
- Added `getFallbackResponse()` for keyword-based fallback when bot service is unreachable (covers: vol/flight, bagage/baggage, paiement/payment, urgence/emergency, and general greeting)
- Database storage is fire-and-forget (non-blocking `.catch(console.error)`)
- Added `_serviceAvailable` boolean flag to response JSON
- Preserved existing validation (message required, max 2000 chars), timeout (10s), and error handling

### 2. CREATED: `src/app/api/bot/flight/search/route.ts`
**Endpoint:** `POST /api/bot/flight/search`
**Body:** `{ departureCode, arrivalCode, date?, passengers? }`
**Behavior:**
- Validates `departureCode` and `arrivalCode` (required strings)
- Normalizes airport codes to uppercase
- Proxies to `http://localhost:3005/flight/search` with 15s timeout
- Fallback: generates 5 mock flight results with random airlines, times, prices (150k–350k XOF)
- Stores `FlightSearch` record in DB (non-blocking) with fallback flag
- Returns `_serviceAvailable` flag

### 3. CREATED: `src/app/api/bot/flight/status/route.ts`
**Endpoint:** `GET /api/bot/flight/status?number=2S221`
**Behavior:**
- Validates `number` query parameter
- Proxies to `http://localhost:3005/flight/status/{number}` with 10s timeout
- Fallback: generates mock status with random gate/terminal, realistic times
- Stores `FlightStatus` via upsert (keyed by `status-{flightNumber}`)
- Returns `_serviceAvailable` flag

### 4. CREATED: `src/app/api/bot/baggage/generate/route.ts`
**Endpoint:** `POST /api/bot/baggage/generate`
**Body:** `{ passengerName, phone?, flightNumber, pnr, destination }`
**Behavior:**
- Validates all required fields (passengerName, flightNumber, pnr, destination)
- Normalizes flightNumber, pnr, destination to uppercase
- Proxies to `http://localhost:3005/baggage/generate` with 10s timeout
- Fallback: generates pseudo-random QR token (`BG-{timestamp}-{random}`), tag number, tracking URL, 7-day expiry
- Stores `BaggageQR` record in DB (non-blocking)
- Returns `_serviceAvailable` flag

### 5. CREATED: `src/app/api/bot/payment/link/route.ts`
**Endpoint:** `POST /api/bot/payment/link`
**Body:** `{ amount, currency?, provider?, reference?, description?, phone?, bookingType?, bookingId? }`
**Behavior:**
- Validates `amount` is a positive number
- Generates transaction reference if not provided (`TX-{timestamp}-{random}`)
- Attempts CinetPay integration if `CINETPAY_API_KEY`, `CINETPAY_SITE_ID`, `CINETPAY_SECRET_KEY` env vars are set
- Fallback: generates mock payment link with provider labels (MTN, Orange, Moov, Card)
- Stores `Payment` record in DB with bookingType, externalRef, status
- Returns `_provider` flag (`'cinetpay'` or `'mock'`)

### 6. CREATED: `src/app/api/bot/health/route.ts`
**Endpoint:** `GET /api/bot/health`
**Behavior:**
- Proxies to `http://localhost:3005/health` with 5s timeout
- Returns three states:
  - `healthy` — bot service responded 200 with its health data
  - `degraded` — bot service responded but with non-200 status
  - `unhealthy` — bot service unreachable (timeout or connection error)
- Includes `checkedAt` timestamp and `reachable` boolean

---

## Architecture Decisions

1. **Non-blocking DB writes**: All database storage operations use `.catch(console.error)` to avoid blocking the API response. The user gets their response immediately; DB persistence happens in the background.

2. **Graceful degradation**: Every route returns sensible fallback data when the bot service (port 3005) is unavailable. This ensures the dashboard remains functional even if the bot service is down.

3. **Service availability flag**: All responses include `_serviceAvailable: boolean` so the frontend can display appropriate UI indicators (e.g., "Live data" vs "Demo data" badges).

4. **Conversation upsert pattern**: The chat route uses `upsert` with a deterministic ID (`${phone}-default`) to handle the case where a user doesn't have an existing conversation record.

5. **CinetPay optional integration**: Payment link route supports CinetPay when environment variables are configured, but falls back to mock payments seamlessly.

---

## Database Models Used

| Model | Route | Operation |
|-------|-------|-----------|
| `Conversation` | `/api/bot/chat` | upsert |
| `Message` | `/api/bot/chat` | create (×2) |
| `FlightSearch` | `/api/bot/flight/search` | create |
| `FlightStatus` | `/api/bot/flight/status` | upsert |
| `BaggageQR` | `/api/bot/baggage/generate` | create |
| `Payment` | `/api/bot/payment/link` | create |

---

## Validation Results

- `bun run lint` — ✅ Passed with zero errors
- Dev server compiled successfully (no route compilation errors in logs)
- All routes follow Next.js 16 App Router conventions (no `'use server'` needed for route.ts)
- TypeScript strict typing throughout

---

## File Tree (New/Modified)

```
src/app/api/bot/
├── chat/route.ts              ← UPDATED
├── health/route.ts            ← CREATED
├── payment/
│   └── link/route.ts          ← CREATED
├── flight/
│   ├── search/route.ts        ← CREATED
│   └── status/route.ts        ← CREATED
└── baggage/
    └── generate/route.ts      ← CREATED
```
