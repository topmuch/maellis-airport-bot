// ============================================================================
// MAELLIS Airport Bot Service — WhatsApp Integration & AI Routing
// Port: 3005 | Built with Bun.serve()
// ============================================================================

const SERVICE_PORT = 3005;
const SERVICE_START_TIME = Date.now();

// ============================================================================
// TYPES
// ============================================================================

type Intent =
  | "flight_search"
  | "flight_status"
  | "baggage_qr"
  | "lounge_booking"
  | "transport_booking"
  | "payment_help"
  | "emergency"
  | "greeting"
  | "help"
  | "unknown";

interface ClassifiedMessage {
  intent: Intent;
  confidence: number;
  entities: string[];
  originalMessage: string;
}

interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    field: string;
    value: {
      messages?: Array<{
        from: string;
        id: string;
        text?: { body: string };
        interactive?: { type: string; [key: string]: unknown };
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

interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

interface BotResponse {
  type: "text" | "interactive";
  text?: string;
  interactive?: {
    type: "button" | "list";
    body: { text: string };
    action: {
      buttons?: Array<{ id: string; title: string }>;
      button?: string;
      sections?: Array<{
        title: string;
        rows: Array<{ id: string; title: string; description?: string }>;
      }>;
    };
  };
}

interface ChatRequest {
  message: string;
  phone?: string;
}

interface ChatResponse {
  intent: Intent;
  confidence: number;
  entities: string[];
  response: BotResponse;
  timestamp: string;
}

// ============================================================================
// COMPREHENSIVE AIRPORT CODES DATABASE
// ============================================================================

const AIRPORT_CODES: Record<string, string> = {
  // ---- Africa (Priority airports for MAELLIS) ----
  "dakar": "DSS",
  "dss": "DSS",
  "abidjan": "ABJ",
  "abj": "ABJ",
  "bamako": "BKO",
  "bko": "BKO",
  "ouagadougou": "OUA",
  "oua": "OUA",
  "lagos": "LOS",
  "los": "LOS",
  "accra": "ACC",
  "acc": "ACC",
  "nairobi": "NBO",
  "nbo": "NBO",
  "casablanca": "CMN",
  "cmn": "CMN",
  "marrakech": "RAK",
  "tunis": "TUN",
  "tun": "TUN",
  "algiers": "ALG",
  "alg": "ALG",
  "cairo": "CAI",
  "cai": "CAI",
  "addis ababa": "ADD",
  "add": "ADD",
  "johannesburg": "JNB",
  "jnb": "JNB",
  "cape town": "CPT",
  "cpt": "CPT",
  "durban": "DUR",
  "abuja": "ABV",
  "dar es salaam": "DAR",
  "monrovia": "ROB",
  "freetown": "FNA",
  "conakry": "CKY",
  "bissau": "OXB",
  "nouakchott": "NKC",
  "niamey": "NIM",
  "ndjamena": "NDJ",
  "libreville": "LBV",
  "douala": "DLA",
  "yaounde": "NSI",
  "kinshasa": "FIH",
  "luanda": "LAD",
  "maputo": "MPM",
  "antananarivo": "TNR",
  "mauritius": "MRU",
  "kigali": "KGL",
  "bujumbura": "BJM",
  "djibouti": "JIB",
  "asmara": "ASM",
  "harare": "HRE",
  "lilongwe": "LLW",
  "lusaka": "LUN",
  "gaborone": "GBE",
  "windhoek": "WDH",
  "malabo": "SSG",
  "saotome": "TMS",

  // ---- North America ----
  "new york": "JFK",
  "nyc": "JFK",
  "los angeles": "LAX",
  "la": "LAX",
  "chicago": "ORD",
  "miami": "MIA",
  "houston": "IAH",
  "dallas": "DFW",
  "phoenix": "PHX",
  "philadelphia": "PHL",
  "atlanta": "ATL",
  "boston": "BOS",
  "san francisco": "SFO",
  "denver": "DEN",
  "seattle": "SEA",
  "las vegas": "LAS",
  "orlando": "MCO",
  "washington dc": "IAD",
  "toronto": "YYZ",
  "montreal": "YUL",
  "vancouver": "YVR",
  "calgary": "YYC",
  "edmonton": "YEG",
  "ottawa": "YOW",
  "winnipeg": "YWG",
  "halifax": "YHZ",
  "quebec": "YQB",
  "mexico city": "MEX",
  "cancun": "CUN",
  "guadalajara": "GDL",
  "monterrey": "MTY",

  // ---- Europe ----
  "london": "LHR",
  "paris": "CDG",
  "frankfurt": "FRA",
  "amsterdam": "AMS",
  "madrid": "MAD",
  "barcelona": "BCN",
  "rome": "FCO",
  "milan": "MXP",
  "venice": "VCE",
  "berlin": "BER",
  "munich": "MUC",
  "hamburg": "HAM",
  "zurich": "ZRH",
  "geneva": "GVA",
  "vienna": "VIE",
  "brussels": "BRU",
  "oslo": "OSL",
  "stockholm": "ARN",
  "copenhagen": "CPH",
  "helsinki": "HEL",
  "dublin": "DUB",
  "lisbon": "LIS",
  "porto": "OPO",
  "athens": "ATH",
  "prague": "PRG",
  "budapest": "BUD",
  "warsaw": "WAW",
  "bucharest": "OTP",
  "sofia": "SOF",
  "zagreb": "ZAG",

  // ---- Asia ----
  "tokyo": "HND",
  "osaka": "KIX",
  "seoul": "ICN",
  "beijing": "PEK",
  "shanghai": "PVG",
  "guangzhou": "CAN",
  "hong kong": "HKG",
  "taipei": "TPE",
  "singapore": "SIN",
  "kuala lumpur": "KUL",
  "jakarta": "CGK",
  "bangkok": "BKK",
  "phuket": "HKT",
  "manila": "MNL",
  "ho chi minh": "SGN",
  "hanoi": "HAN",
  "phnom penh": "PNH",
  "mumbai": "BOM",
  "delhi": "DEL",
  "bangalore": "BLR",
  "chennai": "MAA",
  "hyderabad": "HYD",
  "kolkata": "CCU",

  // ---- Middle East ----
  "dubai": "DXB",
  "abu dhabi": "AUH",
  "doha": "DOH",
  "riyadh": "RUH",
  "jeddah": "JED",
  "kuwait": "KWI",
  "muscat": "MCT",
  "manama": "BAH",
  "tel aviv": "TLV",
  "amman": "AMM",
  "beirut": "BEY",
  "istanbul": "IST",

  // ---- South America ----
  "sao paulo": "GRU",
  "rio de janeiro": "GIG",
  "buenos aires": "EZE",
  "santiago": "SCL",
  "lima": "LIM",
  "bogota": "BOG",
  "medellin": "MDE",

  // ---- Oceania ----
  "sydney": "SYD",
  "melbourne": "MEL",
  "brisbane": "BNE",
  "auckland": "AKL",
};

// Reverse lookup: code -> list of city names
const CODE_TO_CITY: Record<string, string[]> = {};
for (const [city, code] of Object.entries(AIRPORT_CODES)) {
  if (!CODE_TO_CITY[code]) CODE_TO_CITY[code] = [];
  CODE_TO_CITY[code].push(city);
}

// ============================================================================
// AI ROUTER — Keyword-based Intent Classification (multilingual)
// ============================================================================

interface IntentRule {
  intent: Intent;
  keywords: RegExp[];
  priority: number; // higher = checked first
}

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
    intent: "baggage_qr",
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
    intent: "lounge_booking",
    priority: 70,
    keywords: [
      /\b(salle.*attente|lounge|salon.*vip|salon.*privatif)\b/i,
      /\b(lounge|vip.*room|waiting.*room|vip.*lounge)\b/i,
      /(صالة|صالة.*الانتظار|صالة.*VIP)/,
      /\b(dal|dal.*biir)\b/i,
    ],
  },
  {
    intent: "transport_booking",
    priority: 60,
    keywords: [
      /\b(taxi|transport|uber|bolt|navette|bus|voiture|chauffeur)\b/i,
      /\b(taxi|transport|uber|cab|shuttle|bus|car|driver|ride)\b/i,
      /(تاكسي|نقل|أجرة|سيارة|سائق)/,
      /\b(taksi|ndaw)\b/i,
    ],
  },
  {
    intent: "payment_help",
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

function classifyIntent(message: string): ClassifiedMessage {
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
  const entities = extractEntities(message);

  return {
    intent: bestMatch?.intent ?? "unknown",
    confidence: bestMatch?.confidence ?? 0.1,
    entities,
    originalMessage: message,
  };
}

function extractEntities(message: string): string[] {
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
    if (CODE_TO_CITY[c] && !found.some((e) => e.includes(`(${c})`))) {
      found.push(`${CODE_TO_CITY[c][0]} (${c})`);
    }
  }

  return found;
}

// ============================================================================
// RESPONSE GENERATOR — WhatsApp-format with emojis & interactive templates
// ============================================================================

function generateResponse(classified: ClassifiedMessage): BotResponse {
  switch (classified.intent) {
    case "greeting":
      return {
        type: "text",
        text: buildGreetingResponse(),
      };

    case "help":
      return {
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: buildHelpResponse(),
          },
          action: {
            buttons: [
              { id: "flight_search", title: "✈️ Search Flights" },
              { id: "flight_status", title: "🔍 Flight Status" },
              { id: "help_menu", title: "📋 More Options" },
            ],
          },
        },
      };

    case "flight_search":
      return {
        type: "text",
        text: buildFlightSearchResponse(classified),
      };

    case "flight_status":
      return {
        type: "text",
        text: buildFlightStatusResponse(),
      };

    case "baggage_qr":
      return {
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: buildBaggageQRResponse(),
          },
          action: {
            buttons: [
              { id: "baggage_track", title: "📍 Track Baggage" },
              { id: "baggage_qr", title: "📱 Get QR Code" },
              { id: "baggage_help", title: "❓ Baggage Help" },
            ],
          },
        },
      };

    case "lounge_booking":
      return {
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: buildLoungeBookingResponse(),
          },
          action: {
            buttons: [
              { id: "lounge_book", title: "🛋️ Book Lounge" },
              { id: "lounge_prices", title: "💰 View Prices" },
              { id: "lounge_info", title: "ℹ️ Lounge Info" },
            ],
          },
        },
      };

    case "transport_booking":
      return {
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: buildTransportResponse(),
          },
          action: {
            buttons: [
              { id: "transport_taxi", title: "🚕 Order Taxi" },
              { id: "transport_shuttle", title: "🚌 Airport Shuttle" },
              { id: "transport_rental", title: "🚗 Car Rental" },
            ],
          },
        },
      };

    case "payment_help":
      return {
        type: "text",
        text: buildPaymentResponse(),
      };

    case "emergency":
      return {
        type: "text",
        text: buildEmergencyResponse(),
      };

    default:
      return {
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: buildUnknownResponse(),
          },
          action: {
            buttons: [
              { id: "help", title: "❓ Help" },
              { id: "flight_search", title: "✈️ Flights" },
              { id: "contact_agent", title: "👤 Agent" },
            ],
          },
        },
      };
  }
}

// --- Response text builders (multilingual: FR, EN, AR, WOLOF) ---

function buildGreetingResponse(): string {
  return (
    "✈️ *Bienvenue à MAELLIS — Aéroport de Dakar* ✈️\n\n" +
    "🇫🇷 Bonjour ! Comment puis-je vous aider aujourd'hui ?\n" +
    "🇬🇧 Hello! How can I help you today?\n" +
    "🇸🇳 Na nga def? Naka la ñu ci doole?\n" +
    "🇸🇦 مرحبا! كيف يمكنني مساعدتك اليوم؟\n\n" +
    "Vous pouvez me demander :\n" +
    "• ✈️ Rechercher un vol\n" +
    "• 📍 Statut d'un vol\n" +
    "• 🧳 QR code bagages\n" +
    "• 🛋️ Réservation lounge\n" +
    "• 🚕 Transport / Taxi\n" +
    "• 💳 Aide paiement\n\n" +
    "Tapez *aide* pour voir toutes les options !"
  );
}

function buildHelpResponse(): string {
  return (
    "📋 *MAELLIS — Centre d'Aide*\n\n" +
    "Voici ce que je peux faire pour vous :\n\n" +
    "✈️ *Recherche de vols*\n" +
    "   « Je cherche un vol pour Abidjan »\n" +
    "   « Vol Dakar Bamako demain »\n\n" +
    "🔍 *Statut de vol*\n" +
    "   « Statut du vol DSS-ABJ »\n" +
    "   « Mon vol est-il à l'heure ? »\n\n" +
    "🧳 *Bagages*\n" +
    "   « QR code bagage »\n" +
    "   « Où est mon bagage ? »\n\n" +
    "🛋️ *Salon VIP / Lounge*\n" +
    "   « Réserver salon VIP »\n\n" +
    "🚕 *Transport*\n" +
    "   « Commander un taxi »\n" +
    "   « Navette aéroport »\n\n" +
    "💳 *Paiement*\n" +
    "   « Problème de paiement »\n\n" +
    "🇬🇧 *English? Just type in English!*\n" +
    "🇸🇳 *Wolof? Foy woor Wolof rek!*"
  );
}

function buildFlightSearchResponse(classified: ClassifiedMessage): string {
  const entities = classified.entities;
  let entityInfo = "";

  if (entities.length > 0) {
    entityInfo = "\n📍 *Villes détectées :* " + entities.join(", ");
  }

  return (
    "✈️ *Recherche de Vol*\n\n" +
    "Nous recherchons les meilleurs vols pour vous !\n" +
    entityInfo +
    "\n\n" +
    "🇫🇷 Pour continuer, merci de préciser :\n" +
    "• Ville de départ\n" +
    "• Ville de destination\n" +
    "• Date de voyage\n" +
    "• Nombre de passagers\n\n" +
    "🇬🇧 Please specify:\n" +
    "• Departure city\n" +
    "• Destination city\n" +
    "• Travel date\n" +
    "• Number of passengers\n\n" +
    "*Exemple :* « Vol Dakar Abidjan 15 Janvier 2 passagers »\n\n" +
    "🌟 *Aéroports populaires :*\n" +
    "🇸🇳 DSS Dakar | 🇨🇮 ABJ Abidjan | 🇲🇱 BKO Bamako\n" +
    "🇧🇫 OUA Ouagadougou | 🇳🇬 LOS Lagos | 🇬🇭 ACC Accra\n" +
    "🇰🇪 NBO Nairobi | 🇲🇦 CMN Casablanca | 🇿🇦 JNB Johannesburg"
  );
}

function buildFlightStatusResponse(): string {
  return (
    "🔍 *Statut de Vol*\n\n" +
    "Pour vérifier le statut de votre vol, merci de fournir :\n\n" +
    "📝 Numéro de vol *ex: 2S221*\n" +
    "📅 Date du vol\n" +
    "🛫 Aéroport de départ\n\n" +
    "🇫🇷 Exemple : « Statut vol 2S221 Dakar Abidjan »\n" +
    "🇬🇧 Example: \"Status flight 2S221 Dakar Abidjan\"\n" +
    "🇸🇳 Exemple: « Statut saap 2S221 »\n\n" +
    "⏱️ *Info :* Les données de vol sont mises à jour en temps réel."
  );
}

function buildBaggageQRResponse(): string {
  return (
    "🧳 *Service Bagages — MAELLIS*\n\n" +
    "Que souhaitez-vous faire ?\n\n" +
    "📱 *QR Code Bagage*\n" +
    "Obtenez votre code QR de bagage directement sur WhatsApp.\n" +
    "Scannez-le aux bornes pour un dépôt rapide.\n\n" +
    "📍 *Suivi de Bagage*\n" +
    "Suivez votre bagage en temps réel.\n\n" +
    "🇫🇷 *Consignes :*\n" +
    "• Poids max: 23kg (économique), 32kg (affaires)\n" +
    "• Dimensions: 158cm (L+I+H)\n" +
    "• Objets interdits dans les bagages en soute\n\n" +
    "🇬🇧 *Guidelines:*\n" +
    "• Max weight: 23kg (economy), 32kg (business)\n" +
    "• Dimensions: 158cm (L+W+H)"
  );
}

function buildLoungeBookingResponse(): string {
  return (
    "🛋️ *Salon VIP — Aéroport de Dakar*\n\n" +
    "Bienvenue dans notre espace premium !\n\n" +
    "🌟 *Équipements :*\n" +
    "• 🍽️ Restauration et boissons\n" +
    "• 📶 WiFi haut débit\n" +
    "• 💺 Espaces confortables\n" +
    "• 🚿 Douches\n" +
    "• 📺 Ecrans de divertissement\n" +
    "• 💼 Espaces de travail\n\n" +
    "💰 *Tarifs estimés :*\n" +
    "• Accès 3h: 25 000 FCFA\n" +
    "• Accès journée: 40 000 FCFA\n" +
    "• Membre MAELLIS+: Gratuit\n\n" +
    "🇬🇧 *Lounges available for all departing flights!*\n\n" +
    "Sélectionnez une option ci-dessous pour continuer."
  );
}

function buildTransportResponse(): string {
  return (
    "🚕 *Service de Transport — MAELLIS*\n\n" +
    "Comment souhaitez-vous voyager ?\n\n" +
    "🚖 *Taxi / VTC*\n" +
    "• Taxi officiel aéroport: à partir de 5 000 FCFA\n" +
    "• Uber / Bolt disponibles\n" +
    "• Réservation à l'avance possible\n\n" +
    "🚌 *Navette Aéroport*\n" +
    "• Navette Dakar centre: 2 000 FCFA\n" +
    "• Navette hôtels: 3 000 FCFA\n" +
    "• Départ toutes les 30 minutes\n\n" +
    "🚗 *Location de Voiture*\n" +
    "• Hertz, Avis, Europcar au terminal\n" +
    "• Réservation en ligne disponible\n\n" +
    "🇬🇧 *Transport services from Dakar airport available 24/7!*"
  );
}

function buildPaymentResponse(): string {
  return (
    "💳 *Aide Paiement — MAELLIS*\n\n" +
    "Nous acceptons plusieurs modes de paiement :\n\n" +
    "✅ *Carte bancaire* (Visa, Mastercard)\n" +
    "✅ *Mobile Money* (Orange Money, Wave, MTN)\n" +
    "✅ *Virement bancaire*\n" +
    "✅ *Espèces* (au guichet)\n\n" +
    "🇫🇷 *En cas de problème :*\n" +
    "• Vérifiez vos informations de carte\n" +
    "• Assurez-vous d'avoir les fonds nécessaires\n" +
    "• Contactez votre banque si le paiement est refusé\n\n" +
    "🇬🇧 *If payment fails:*\n" +
    "• Check your card details\n" +
    "• Ensure sufficient funds\n" +
    "• Contact your bank if declined\n\n" +
    "📞 *Support :* +221 33 XXX XXXX\n" +
    "📧 *Email :* support@maellis.sn"
  );
}

function buildEmergencyResponse(): string {
  return (
    "🚨 *URGENCE — AÉROPORT DE DAKAR* 🚨\n\n" +
    "🇫🇷 *Numéros d'urgence :*\n" +
    "• 🚑 SAMU / Ambulance: *15*\n" +
    "• 🚓 Police: *17*\n" +
    "• 🚒 Pompiers: *18*\n" +
    "• ✈️ Sécurité aéroport: +221 33 869 00 00\n\n" +
    "🇬🇧 *Emergency Numbers:*\n" +
    "• 🚑 Ambulance: *15*\n" +
    "• 🚓 Police: *17*\n" +
    "• 🚒 Fire: *18*\n" +
    "• ✈️ Airport Security: +221 33 869 00 00\n\n" +
    "🇸🇦 *أرقام الطوارئ:*\n" +
    "• 🚑 إسعاف: *15*\n" +
    "• 🚓 شرطة: *17*\n" +
    "• 🚒 إطفاء: *18*\n\n" +
    "⏱️ *L'aéroport dispose d'un service médical 24h/24*\n" +
    "📍 *Bureau d'information : Hall Arrivées, niveau 0*"
  );
}

function buildUnknownResponse(): string {
  return (
    "🤔 *Désolé, je n'ai pas compris votre demande.*\n\n" +
    "🇫🇷 Je suis l'assistant MAELLIS. Voici ce que je peux faire :\n" +
    "🇬🇧 Sorry, I didn't understand. Here's what I can help with:\n\n" +
    "• ✈️ Rechercher un vol / Search flights\n" +
    "• 📍 Statut de vol / Flight status\n" +
    "• 🧳 QR code bagage / Baggage QR\n" +
    "• 🛋️ Salon VIP / VIP Lounge\n" +
    "• 🚕 Transport / Transport\n" +
    "• 💳 Paiement / Payment\n\n" +
    "Tapez *aide* ou *help* pour plus d'options !"
  );
}

// ============================================================================
// WHATSAPP API — Send Message Helper
// ============================================================================

async function sendWhatsAppMessage(
  to: string,
  response: BotResponse,
): Promise<void> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    console.log("⚠️  WHATSAPP_ACCESS_TOKEN not set — skipping send");
    return;
  }

  const phoneNumberId = "TODO_PHONE_NUMBER_ID"; // Would come from env
  const body = JSON.stringify({
    messaging_product: "whatsapp",
    to,
    type: response.type,
    ...(response.type === "text"
      ? { text: { body: response.text!, preview_url: false } }
      : { interactive: response.interactive }),
  });

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body,
      },
    );
    console.log(`📱 WhatsApp API response: ${res.status}`);
  } catch (err) {
    console.error("❌ Failed to send WhatsApp message:", err);
  }
}

// ============================================================================
// WEBHOOK HANDLER — Parse Meta WhatsApp Cloud API payloads
// ============================================================================

function parseWebhookPayload(body: unknown): {
  phone: string | null;
  messageText: string;
  messageType: string;
} {
  const payload = body as WhatsAppWebhookPayload;
  if (!payload?.entry?.length) {
    return { phone: null, messageText: "", messageType: "unknown" };
  }

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const messages = change.value?.messages;
      if (!messages?.length) continue;

      const msg = messages[0];
      let text = "";
      let type = msg.type;

      if (msg.type === "text" && msg.text) {
        text = msg.text.body;
      } else if (msg.type === "interactive" && msg.interactive) {
        text = JSON.stringify(msg.interactive);
      } else if (msg.type === "location" && msg.location) {
        text = `Location: ${msg.location.latitude},${msg.location.longitude}`;
        if (msg.location.name) text += ` (${msg.location.name})`;
      }

      return {
        phone: msg.from,
        messageText: text,
        messageType: type,
      };
    }
  }

  return { phone: null, messageText: "", messageType: "unknown" };
}

// ============================================================================
// HTTP SERVER — Bun.serve()
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

console.log("🚀 MAELLIS Airport Bot Service starting...");
console.log(`📡 Port: ${SERVICE_PORT}`);

Bun.serve({
  port: SERVICE_PORT,
  fetch(req: Request) {
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

    // --- GET /webhook — Meta verification ---
    if (method === "GET" && path === "/webhook") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "maellis_test_token";

      if (mode === "subscribe" && token === verifyToken) {
        console.log("✅ Webhook verified with Meta");
        return textResponse(challenge || "", 200);
      }
      console.log("❌ Webhook verification failed");
      return textResponse("Forbidden", 403);
    }

    // --- POST /webhook — Receive WhatsApp messages ---
    if (method === "POST" && path === "/webhook") {
      return (async () => {
        try {
          const body = await req.json();
          console.log("📩 Webhook payload received:", JSON.stringify(body).slice(0, 200));

          const { phone, messageText, messageType } = parseWebhookPayload(body);

          if (!phone) {
            // Could be a status update or empty payload — acknowledge silently
            console.log("ℹ️  No message in webhook payload (possibly status update)");
            return jsonResponse({ status: "ok" });
          }

          console.log(`📞 From: ${phone} | Type: ${messageType} | Text: ${messageText.slice(0, 80)}`);

          // Classify intent
          const classified = classifyIntent(messageText);
          console.log(`🎯 Intent: ${classified.intent} (confidence: ${(classified.confidence * 100).toFixed(0)}%)`);

          // Generate response
          const response = generateResponse(classified);

          // Send via WhatsApp API (async, fire-and-forget)
          sendWhatsAppMessage(phone, response);

          return jsonResponse({
            status: "processed",
            intent: classified.intent,
            confidence: classified.confidence,
            entities: classified.entities,
            messageType,
          });
        } catch (err) {
          console.error("❌ Error processing webhook:", err);
          return jsonResponse({ error: "Internal server error" }, 500);
        }
      })();
    }

    // --- GET /health ---
    if (method === "GET" && path === "/health") {
      const uptime = Math.floor((Date.now() - SERVICE_START_TIME) / 1000);
      return jsonResponse({
        status: "healthy",
        service: "maellis-bot",
        uptime,
        version: "1.0.0",
        port: SERVICE_PORT,
        timestamp: new Date().toISOString(),
      });
    }

    // --- POST /chat — Test chat endpoint ---
    if (method === "POST" && path === "/chat") {
      return (async () => {
        try {
          const body = (await req.json()) as ChatRequest;
          const { message, phone } = body;

          if (!message || typeof message !== "string") {
            return jsonResponse({ error: "Field 'message' is required" }, 400);
          }

          console.log(`💬 Chat test | Phone: ${phone ?? "anonymous"} | Message: ${message.slice(0, 80)}`);

          const classified = classifyIntent(message);
          console.log(`🎯 Intent: ${classified.intent} (confidence: ${(classified.confidence * 100).toFixed(0)}%)`);

          const response = generateResponse(classified);

          const chatResponse: ChatResponse = {
            intent: classified.intent,
            confidence: classified.confidence,
            entities: classified.entities,
            response,
            timestamp: new Date().toISOString(),
          };

          return jsonResponse(chatResponse);
        } catch (err) {
          console.error("❌ Error processing chat:", err);
          return jsonResponse({ error: "Internal server error" }, 500);
        }
      })();
    }

    // --- GET /airports — List airport codes ---
    if (method === "GET" && path === "/airports") {
      const search = url.searchParams.get("q")?.toLowerCase() || "";
      if (search) {
        const results: Array<{ city: string; code: string }> = [];
        for (const [city, code] of Object.entries(AIRPORT_CODES)) {
          if (city.includes(search) || code.toLowerCase() === search) {
            results.push({ city, code });
          }
        }
        return jsonResponse({ results, count: results.length });
      }
      return jsonResponse({
        airports: AIRPORT_CODES,
        count: Object.keys(AIRPORT_CODES).length,
      });
    }

    // --- 404 ---
    return jsonResponse(
      {
        error: "Not Found",
        service: "maellis-bot",
        endpoints: ["/webhook", "/health", "/chat", "/airports"],
      },
      404,
    );
  },
});

console.log(`✅ MAELLIS Airport Bot Service running on http://localhost:${SERVICE_PORT}`);
console.log("📡 Endpoints:");
console.log(`   GET  /webhook  — Meta verification`);
console.log(`   POST /webhook  — Receive WhatsApp messages`);
console.log(`   GET  /health   — Health check`);
console.log(`   POST /chat     — Test chat endpoint`);
console.log(`   GET  /airports — Airport codes database`);
