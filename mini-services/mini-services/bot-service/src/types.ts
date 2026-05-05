// ============================================================================
// MAELLIS Airport Bot — All TypeScript Interfaces & Types
// ============================================================================

// ---- Intent Types ----

export type Intent =
  | "flight_search"
  | "flight_status"
  | "baggage"
  | "lounge"
  | "transport"
  | "payment"
  | "emergency"
  | "ticket_scan"
  | "greeting"
  | "help"
  | "unknown";

export type SupportedLanguage = "fr" | "en" | "wo" | "ar";

// ---- AI Classification ----

export interface AIEntities {
  flight_number?: string;
  origin?: string;
  destination?: string;
  date?: string;
  passengers?: number;
  name?: string;
  phone?: string;
  location?: string;
  description?: string;
}

export interface AIResult {
  intent: Intent;
  entities: AIEntities;
  language: SupportedLanguage;
  confidence: number;
}

// ---- Keyword Fallback Classification ----

export interface ClassifiedMessage {
  intent: Intent;
  confidence: number;
  entities: string[];
  originalMessage: string;
}

export interface IntentRule {
  intent: Intent;
  keywords: RegExp[];
  priority: number;
}

// ---- WhatsApp ----

export interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    field: string;
    value: {
      messages?: Array<{
        from: string;
        id: string;
        text?: { body: string };
        interactive?: { type: string; [key: string]: unknown };
        image?: { id: string; caption?: string; mime_type?: string; sha256?: string };
        document?: { id: string; caption?: string; filename?: string; mime_type?: string };
        location?: { latitude: number; longitude: number; name?: string };
        type: string;
        timestamp: string;
      }>;
      contacts?: Array<{
        wa_id: string;
        profile?: { name: string };
      }>;
      statuses?: Array<{ id: string; status: string }>;
    };
  }>;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

// ---- Bot Response ----

export interface WhatsAppInteractiveAction {
  buttons?: Array<{ id: string; title: string }>;
  button?: string;
  sections?: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}

export interface BotResponse {
  type: "text" | "interactive";
  text?: string;
  interactive?: {
    type: "button" | "list";
    body: { text: string };
    action: WhatsAppInteractiveAction;
  };
}

// ---- Chat API ----

export interface ChatRequest {
  message: string;
  phone?: string;
}

export interface ChatResponse {
  intent: Intent;
  confidence: number;
  language: SupportedLanguage;
  entities: string[];
  aiEntities?: AIEntities;
  response: BotResponse;
  timestamp: string;
}

// ---- Flight Service ----

export interface FlightSearchParams {
  departureCode: string;
  arrivalCode: string;
  date?: string;
  passengers?: number;
}

export interface FlightResult {
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureTerminal: string;
  arrivalTerminal: string;
  departureGate: string;
  arrivalGate: string;
  status: string;
  isDelayed: boolean;
  delayMinutes: number;
}

export interface FlightStatusResult {
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  status: string;
  isDelayed: boolean;
  delayMinutes: number;
  gate?: string;
  terminal?: string;
}

// ---- Baggage Service ----

export interface BaggageQRParams {
  passengerName: string;
  phone: string;
  flightNumber: string;
  pnr: string;
  destination: string;
}

export interface BaggageQRResult {
  token: string;
  trackingUrl: string;
  message: string;
  validUntil: string;
}

export interface BaggageVerification {
  passengerName: string;
  phone: string;
  flightNumber: string;
  pnr: string;
  destination: string;
  type: string;
  exp: number;
  iat?: number;
}

// ---- Payment Service ----

export type PaymentProvider = "OM" | "WAVE" | "CINETPAY";

export interface PaymentLinkParams {
  amount: number;
  currency: string;
  provider: PaymentProvider;
  reference: string;
  description: string;
  phone?: string;
}

export interface PaymentStatus {
  transactionId: string;
  status: "pending" | "success" | "failed" | "expired";
  amount: number;
  currency: string;
  provider: PaymentProvider;
  timestamp: string;
}

// ---- OCR / Ticket Scan ----

export interface OCRAnalyzeRequest {
  imageData: string; // base64 or URL
  phone: string;
  source?: string;
}

export interface TicketExtraction {
  pnr?: string | null;
  flightNumber?: string | null;
  airline?: string | null;
  departureCode?: string | null;
  arrivalCode?: string | null;
  departureCity?: string | null;
  arrivalCity?: string | null;
  flightDate?: string | null;
  seat?: string | null;
  boardingTime?: string | null;
  gate?: string | null;
  terminal?: string | null;
  passengerClass?: string | null;
  passengerName?: string | null;
  confidence: number;
  rawText: string;
  provider: string;
}

export interface OCRAnalyzeResult {
  success: boolean;
  data?: TicketExtraction;
  rawText?: string;
  message?: string;
  scanId?: string;
}

// ---- Health Check ----

export interface HealthStatus {
  status: "healthy" | "degraded";
  service: string;
  uptime: number;
  version: string;
  port: number;
  timestamp: string;
  services: {
    whatsapp: boolean;
    groq: boolean;
    aviationStack: boolean;
    cinetpay: boolean;
  };
}
