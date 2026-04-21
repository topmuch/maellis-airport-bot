// ============================================================================
// MAELLIS Airport Bot — AI Service (Groq LLM + Keyword Fallback)
// ============================================================================

import type { AIResult, AIEntities, Intent, SupportedLanguage, ClassifiedMessage, IntentRule } from "../types";
import { AIRPORT_CODES } from "../airports";

// ---- Constants ----

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama3-8b-8192";

// ---- Keyword Classification Rules (from original index.ts) ----

const INTENT_RULES: IntentRule[] = [
  {
    intent: "emergency",
    priority: 100,
    keywords: [
      /\b(urgence|urgences)\b/i,
      /\b(emergency|emergencies)\b/i,
      /(طوارئ|خطر|نجدة)/,
      /\b(nopp\b|daraja\b|bayyi\b)/i,
      /\b(sos)\b/i,
      /\b(help.*urgent|urgent.*help)\b/i,
      /\b(ayuda.*urgente|urgente.*ayuda)\b/i,
    ],
  },
  {
    intent: "flight_status",
    priority: 90,
    keywords: [
      /\b(statut.*vol|vol.*statut|etat.*vol|vol.*retard|vol.*annul)\b/i,
      /\b(flight.*status|status.*flight|flight.*delay|flight.*cancel)\b/i,
      /(حالة.*رحلة|رحلة.*تأخير|رحلة.*إلغاء)/,
      /\b(nopp.*saap|saap.*nopp|saap.*wàqti)\b/i,
    ],
  },
  {
    intent: "baggage",
    priority: 80,
    keywords: [
      /\b(bagage|colis|valise|étiquette|qr.*bagage|bagage.*qr)\b/i,
      /\b(baggage|luggage|suitcase|tag|qr.*bag|bag.*qr)\b/i,
      /(حقائب|أمتعة|شنطة|تيكيت)/,
      /\b(saab)\b/i,
      /\b(maq)\b/i,
    ],
  },
  {
    intent: "lounge",
    priority: 70,
    keywords: [
      /\b(salle.*attente|lounge|salon.*vip|salon.*privatif)\b/i,
      /\b(lounge|vip.*room|waiting.*room|vip.*lounge)\b/i,
      /(صالة|صالة.*الانتظار|صالة.*VIP)/,
      /\b(dal|dal.*biir)\b/i,
    ],
  },
  {
    intent: "transport",
    priority: 60,
    keywords: [
      /\b(taxi|transport|uber|bolt|navette|bus|voiture|chauffeur)\b/i,
      /\b(taxi|transport|uber|cab|shuttle|bus|car|driver|ride)\b/i,
      /(تاكسي|نقل|أجرة|سيارة|سائق)/,
      /\b(taksi|ndaw)\b/i,
    ],
  },
  {
    intent: "payment",
    priority: 55,
    keywords: [
      /\b(paiement|payer|facture|facturation|prix|coût|remboursement|argent|cb|carte)\b/i,
      /\b(payment|pay|bill|billing|price|cost|refund|money|card|credit)\b/i,
      /(دفع|فاتورة|سعر|تكلفة|استرداد|فلوس|بطاقة)/,
      /\b(pay|peeyu|xool)\b/i,
    ],
  },
  {
    intent: "flight_search",
    priority: 50,
    keywords: [
      /\b(vol|vols|avion|billet|réserver|réserve|trajet|itinéraire|décoll|atterr|envol)\b/i,
      /\b(flight|flights|airplane|ticket|book|booking|fly|flying|depart|arrive|trip)\b/i,
      /(طيران|رحلة|رحلات|تذكرة|حجز|طائرة|إقلاع|هبوط)/,
      /\b(ddaayan|saap|duug|naatal)\b/i,
      /\b(from\s+\w+\s+to\s+\w+)/i,
      /\b(de\s+\w+\s+(?:à|a)\s+\w+)/i,
    ],
  },
  {
    intent: "greeting",
    priority: 20,
    keywords: [
      /^(bonjour|salut|bonsoir|coucou|hey|hi|hello|yo|wesh)/i,
      /^(hello|hi|hey|good\s*(morning|afternoon|evening)|greetings)/i,
      /^(مرحبا|السلام|اهلا|هاي|أهلا)/,
      /^(na\s*nga\s*def|jam\s*nga\s*am|salaam\s*aleekum|na\s*laay)/i,
      /^(comment\s*(vas-tu|ca va|allez-vous)|how\s*(are|is|r\s*u)|what'?s?\s*up)/i,
    ],
  },
  {
    intent: "help",
    priority: 15,
    keywords: [
      /\b(aide|aider|assistant|support|assistance|info|information|question)\b/i,
      /\b(help|support|assist|info|information|question|guide|how\s*(to|do|can))\b/i,
      /(مساعدة|ساعدني|معلومات|سؤال|دليل)/,
      /\b(ndeg)\b/i,
    ],
  },
];

// ---- Main AI Analysis (Groq first, keyword fallback) ----

/**
 * Analyze a user message to determine intent, entities, language, and confidence.
 * Uses Groq LLM when API key is available, otherwise falls back to keyword matching.
 */
export async function analyzeIntent(message: string): Promise<AIResult> {
  const apiKey = process.env.GROQ_API_KEY;

  if (apiKey) {
    try {
      return await groqClassify(message, apiKey);
    } catch (err) {
      console.error("❌ Groq classification failed, falling back to keywords:", err);
    }
  }

  return fallbackClassify(message);
}

/**
 * Groq LLM-based intent classification.
 */
async function groqClassify(message: string, apiKey: string): Promise<AIResult> {
  const systemPrompt = `You are MAELLIS, an AI airport assistant for West African airports (Dakar DSS, Abidjan ABJ, Bamako BKO, etc.).
Analyze the user message and return ONLY a JSON object with this exact structure:
{
  "intent": "flight_search" | "flight_status" | "baggage" | "lounge" | "transport" | "payment" | "emergency" | "greeting" | "help" | "unknown",
  "entities": { "flight_number": "", "origin": "", "destination": "", "date": "", "passengers": 0, "name": "", "phone": "", "location": "", "description": "" },
  "language": "fr" | "en" | "wo" | "ar",
  "confidence": 0.0 to 1.0
}

Rules:
- Detect the language automatically (French, English, Wolof, Arabic)
- Extract any city names and map to IATA codes using this mapping:
${JSON.stringify(AIRPORT_CODES)}
- For greetings in any language, return intent: "greeting"
- For emergency keywords (SOS, urgence, danger), return intent: "emergency" immediately
- Be generous with confidence (0.7+) when intent is clear
- Return ONLY the JSON, no extra text`;

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    console.error("❌ Groq API error:", res.status);
    throw new Error(`Groq API error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from Groq");
  }

  try {
    const parsed = JSON.parse(content) as Partial<AIResult>;
    return {
      intent: isValidIntent(parsed.intent) ? parsed.intent : "unknown",
      entities: {
        flight_number: parsed.entities?.flight_number || "",
        origin: parsed.entities?.origin || "",
        destination: parsed.entities?.destination || "",
        date: parsed.entities?.date || "",
        passengers: parsed.entities?.passengers || 0,
        name: parsed.entities?.name || "",
        phone: parsed.entities?.phone || "",
        location: parsed.entities?.location || "",
        description: parsed.entities?.description || "",
      },
      language: isValidLanguage(parsed.language) ? parsed.language : "fr",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    };
  } catch {
    throw new Error("Failed to parse Groq response as JSON");
  }
}

/**
 * Keyword-based fallback classifier (preserved from original index.ts).
 */
function fallbackClassify(message: string): AIResult {
  const classified = classifyByKeywords(message);
  const language = detectLanguage(message);

  return {
    intent: classified.intent,
    entities: {
      flight_number: extractFlightNumber(message),
      origin: "",
      destination: "",
      date: extractDate(message),
      passengers: 0,
      name: "",
      phone: "",
      location: "",
      description: "",
    },
    language,
    confidence: classified.confidence,
  };
}

/**
 * Keyword-based intent classification with priority ordering.
 */
export function classifyByKeywords(message: string): ClassifiedMessage {
  const trimmed = message.trim().toLowerCase();
  if (!trimmed) {
    return {
      intent: "unknown",
      confidence: 0,
      entities: [],
      originalMessage: message,
    };
  }

  // Sort rules by priority (descending)
  const sorted = [...INTENT_RULES].sort((a, b) => b.priority - a.priority);

  let bestMatch: { intent: Intent; confidence: number; rule: IntentRule } | null = null;

  for (const rule of sorted) {
    for (const pattern of rule.keywords) {
      if (pattern.test(message)) {
        // Count keyword matches to boost confidence
        let matchCount = 0;
        for (const p of rule.keywords) {
          if (p.test(message)) matchCount++;
        }
        const confidence = Math.min(0.5 + matchCount * 0.15, 0.99);
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { intent: rule.intent, confidence, rule };
        }
        break; // move to next rule
      }
    }
  }

  // Extract entities (airport/city names) from message
  const entities = extractEntitiesFromMessage(message);

  return {
    intent: bestMatch?.intent ?? "unknown",
    confidence: bestMatch?.confidence ?? 0.1,
    entities,
    originalMessage: message,
  };
}

// ---- Language Detection ----

function detectLanguage(message: string): SupportedLanguage {
  const lower = message.toLowerCase();

  // Arabic detection (Arabic script)
  if (/[\u0600-\u06FF]/.test(message)) return "ar";

  // Wolof detection
  const wolofPatterns = [
    /\b(na\s*nga\s*def|jam\s*nga\s*am|naka\s*la|ma\s*nag)\b/i,
    /\b(salaam\s*aleekum|salam\s*aleikum)\b/i,
    /\b(ddaayan|saap|duug|naatal|taksi)\b/i,
    /\b(nopp|daraja|bayyi|saab|maq|dal|biir|ndaw|ndeg)\b/i,
    /\b(jamm|sant|baax|bëgg|dem|bind|wool)\b/i,
  ];
  for (const p of wolofPatterns) {
    if (p.test(lower)) return "wo";
  }

  // English detection
  const englishPatterns = [
    /\b(flight|airport|baggage|luggage|taxi|payment|booking|ticket|status)\b/i,
    /\b(hello|hi|hey|please|help|thanks|thank you)\b/i,
    /\b(search|find|check|book|reserve|cancel|delay)\b/i,
  ];
  for (const p of englishPatterns) {
    if (p.test(lower)) return "en";
  }

  // Default: French (primary language for West African airports)
  return "fr";
}

// ---- Entity Extraction Helpers ----

function extractFlightNumber(message: string): string {
  // Match patterns like 2S221, AF123, EK456, etc.
  const patterns = [
    /\b([A-Z]{2}\d{2,4})\b/,
    /\b(vol\s+)?([A-Z]{2}\s*\d{2,4})\b/i,
    /\b(flight\s+)?([A-Z]{2}\s*\d{2,4})\b/i,
  ];

  for (const p of patterns) {
    const m = p.exec(message);
    if (m) {
      // Return the cleaned flight number (e.g., "2S221")
      return m[1] ? m[1].replace(/\s/g, "").toUpperCase() : m[2].replace(/\s/g, "").toUpperCase();
    }
  }

  return "";
}

function extractDate(message: string): string {
  const today = new Date();
  const lower = message.toLowerCase();

  // Relative dates
  if (/\b(demain|tomorrow)\b/i.test(message)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }
  if (/\b(apr[eè]s-demain|day after tomorrow)\b/i.test(message)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  }

  // French month patterns: "15 janvier", "3 mars"
  const frenchMonths: Record<string, number> = {
    janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
    juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11,
  };

  const frenchDateMatch = lower.match(/(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/i);
  if (frenchDateMatch) {
    const day = parseInt(frenchDateMatch[1], 10);
    const month = frenchMonths[frenchDateMatch[2].toLowerCase()];
    if (month !== undefined) {
      const d = new Date(today.getFullYear(), month, day);
      if (d < today) d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().split("T")[0];
    }
  }

  // ISO date pattern: 2025-01-15
  const isoMatch = message.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = message.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
  }

  return "";
}

function extractEntitiesFromMessage(message: string): string[] {
  const found: string[] = [];
  const lower = message.toLowerCase();

  for (const [city, code] of Object.entries(AIRPORT_CODES)) {
    if (lower.includes(city) && city.length > 2) {
      found.push(`${city} (${code})`);
    }
  }

  // Also check for standalone IATA codes (3 uppercase letters)
  const codePattern = /\b([A-Z]{3})\b/g;
  let match: RegExpExecArray | null;
  while ((match = codePattern.exec(message)) !== null) {
    const c = match[1];
    // Don't treat common words as airport codes
    if (
      !["THE", "AND", "FOR", "NOT", "BUT", "ARE", "YOU", "ALL", "ANY", "CAN", "HER", "WAS", "ONE", "OUR", "OUT"].includes(c)
    ) {
      const cities = Object.entries(AIRPORT_CODES)
        .filter(([, v]) => v === c)
        .map(([k]) => k);
      if (cities.length && !found.some((e) => e.includes(`(${c})`))) {
        found.push(`${cities[0]} (${c})`);
      }
    }
  }

  return found;
}

// ---- Validators ----

function isValidIntent(intent: unknown): intent is Intent {
  const valid: Intent[] = [
    "flight_search", "flight_status", "baggage", "lounge",
    "transport", "payment", "emergency", "greeting", "help", "unknown",
  ];
  return typeof intent === "string" && (valid as string[]).includes(intent);
}

function isValidLanguage(lang: unknown): lang is SupportedLanguage {
  const valid: SupportedLanguage[] = ["fr", "en", "wo", "ar"];
  return typeof lang === "string" && (valid as string[]).includes(lang);
}

/**
 * Check if Groq API key is configured.
 */
export function isGroqConfigured(): boolean {
  return !!process.env.GROQ_API_KEY;
}
