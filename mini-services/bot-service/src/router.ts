// ============================================================================
// MAELLIS Airport Bot — Intent Router & Response Generator
// ============================================================================

import type { AIResult, BotResponse, ClassifiedMessage } from "./types";
import { findAirportCode } from "./airports";
import { searchFlights, getFlightStatus } from "./services/flight.service";
import { generateBaggageQR } from "./services/baggage.service";
import { generatePaymentLink, getAvailableProviders, getProviderLabel } from "./services/payment.service";

// ============================================================================
// Main Response Generator (uses AI result + service calls)
// ============================================================================

/**
 * Generate a bot response based on the AI classification result.
 * For actionable intents (flight_search, flight_status, baggage, etc.),
 * calls the appropriate service and formats the response.
 */
export async function generateResponse(
  aiResult: AIResult,
  classified?: ClassifiedMessage,
): Promise<BotResponse> {
  // Merge classified entities with AI entities for richer context
  const entities = classified?.entities || [];

  switch (aiResult.intent) {
    case "greeting":
      return {
        type: "text",
        text: buildGreetingResponse(aiResult.language),
      };

    case "help":
      return {
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: buildHelpResponse() },
          action: {
            buttons: [
              { id: "flight_search", title: "✈️ Rechercher un vol" },
              { id: "flight_status", title: "🔍 Statut d'un vol" },
              { id: "help_menu", title: "📋 Plus d'options" },
            ],
          },
        },
      };

    case "flight_search":
      return await buildFlightSearchResponse(aiResult, entities);

    case "flight_status":
      return await buildFlightStatusResponse(aiResult);

    case "baggage":
      return {
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: buildBaggageResponse() },
          action: {
            buttons: [
              { id: "baggage_track", title: "📍 Suivre bagage" },
              { id: "baggage_qr", title: "📱 Obtenir QR Code" },
              { id: "baggage_help", title: "❓ Aide bagages" },
            ],
          },
        },
      };

    case "lounge":
      return buildLoungeResponse(aiResult);

    case "transport":
      return buildTransportResponse(aiResult);

    case "payment":
      return buildPaymentResponse(aiResult);

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
          body: { text: buildUnknownResponse() },
          action: {
            buttons: [
              { id: "help", title: "❓ Aide" },
              { id: "flight_search", title: "✈️ Vols" },
              { id: "contact_agent", title: "👤 Agent" },
            ],
          },
        },
      };
  }
}

// ============================================================================
// Service-Backed Response Builders
// ============================================================================

/**
 * Flight search: call AviationStack API and format results.
 */
async function buildFlightSearchResponse(
  aiResult: AIResult,
  entities: string[],
): Promise<BotResponse> {
  const { origin, destination, date, passengers } = aiResult.entities;

  // Try to resolve city names to IATA codes
  let departureCode = origin ? findAirportCode(origin) : null;
  let arrivalCode = destination ? findAirportCode(destination) : null;

  // If AI didn't extract cities, try from entity list
  if (!departureCode || !arrivalCode) {
    for (const entity of entities) {
      const match = entity.match(/(.+)\(([A-Z]{3})\)/);
      if (match) {
        const code = match[2];
        if (!departureCode) {
          departureCode = code;
        } else if (!arrivalCode) {
          arrivalCode = code;
        }
      }
    }
  }

  // If we have both departure and arrival codes, search flights
  if (departureCode && arrivalCode) {
    const flights = await searchFlights({
      departureCode,
      arrivalCode,
      date: date || undefined,
      passengers: passengers || undefined,
    });

    const flightText = formatFlightResults(flights, departureCode, arrivalCode);

    return {
      type: "text",
      text: flightText,
    };
  }

  // Not enough info to search — ask user for details
  let entityInfo = "";
  if (entities.length > 0) {
    entityInfo = "\n📍 *Villes détectées :* " + entities.join(", ");
  }

  return {
    type: "text",
    text:
      "✈️ *Recherche de Vol*\n\n" +
      "Nous recherchons les meilleurs vols pour vous !" +
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
      "🇰🇪 NBO Nairobi | 🇲🇦 CMN Casablanca | 🇿🇦 JNB Johannesburg",
  };
}

/**
 * Flight status: call AviationStack API and format status.
 */
async function buildFlightStatusResponse(aiResult: AIResult): Promise<BotResponse> {
  const { flight_number } = aiResult.entities;

  if (flight_number) {
    const status = await getFlightStatus(flight_number);

    return {
      type: "text",
      text: formatFlightStatus(status),
    };
  }

  return {
    type: "text",
    text:
      "🔍 *Statut de Vol*\n\n" +
      "Pour vérifier le statut de votre vol, merci de fournir :\n\n" +
      "📝 Numéro de vol *ex: 2S221*\n" +
      "📅 Date du vol\n" +
      "🛫 Aéroport de départ\n\n" +
      "🇫🇷 Exemple : « Statut vol 2S221 Dakar Abidjan »\n" +
      "🇬🇧 Example: \"Status flight 2S221 Dakar Abidjan\"\n" +
      "🇸🇳 Exemple: « Statut saap 2S221 »\n\n" +
      "⏱️ *Info :* Les données de vol sont mises à jour en temps réel.",
  };
}

/**
 * Lounge booking: generate payment links for lounge access.
 */
function buildLoungeResponse(aiResult: AIResult): BotResponse {
  const ref = `LOUNGE_${Date.now()}`;

  // Generate payment links for lounge options
  const access3h = generatePaymentLink({
    amount: 25000,
    currency: "XOF",
    provider: "CINETPAY",
    reference: `${ref}_3H`,
    description: "Salon VIP - Accès 3h",
  });

  const accessFullDay = generatePaymentLink({
    amount: 40000,
    currency: "XOF",
    provider: "CINETPAY",
    reference: `${ref}_JOUR`,
    description: "Salon VIP - Accès journée",
  });

  return {
    type: "text",
    text:
      "🛋️ *Salon VIP — Aéroport de Dakar*\n\n" +
      "Bienvenue dans notre espace premium !\n\n" +
      "🌟 *Équipements :*\n" +
      "• 🍽️ Restauration et boissons\n" +
      "• 📶 WiFi haut débit\n" +
      "• 💺 Espaces confortables\n" +
      "• 🚿 Douches\n" +
      "• 📺 Ecrans de divertissement\n" +
      "• 💼 Espaces de travail\n\n" +
      "💰 *Tarifs :*\n" +
      "• Accès 3h: 25 000 FCFA\n" +
      `  🔗 ${access3h}\n\n` +
      "• Accès journée: 40 000 FCFA\n" +
      `  🔗 ${accessFullDay}\n\n` +
      "• Membre MAELLIS+: Gratuit\n\n" +
      "🇬🇧 *Lounges available for all departing flights!*\n" +
      "💳 Paiement: Orange Money, Wave, Carte bancaire",
  };
}

/**
 * Transport: generate payment links for transport booking.
 */
function buildTransportResponse(aiResult: AIResult): BotResponse {
  const ref = `TRANS_${Date.now()}`;

  const taxiLink = generatePaymentLink({
    amount: 5000,
    currency: "XOF",
    provider: "OM",
    reference: `${ref}_TAXI`,
    description: "Taxi officiel aéroport",
  });

  const shuttleLink = generatePaymentLink({
    amount: 2000,
    currency: "XOF",
    provider: "WAVE",
    reference: `${ref}_NAVETTE`,
    description: "Navette aéroport - Dakar centre",
  });

  return {
    type: "text",
    text:
      "🚕 *Service de Transport — MAELLIS*\n\n" +
      "Comment souhaitez-vous voyager ?\n\n" +
      "🚖 *Taxi / VTC*\n" +
      "• Taxi officiel aéroport: à partir de 5 000 FCFA\n" +
      `  🔗 Réserver: ${taxiLink}\n` +
      "• Uber / Bolt disponibles\n" +
      "• Réservation à l'avance possible\n\n" +
      "🚌 *Navette Aéroport*\n" +
      "• Navette Dakar centre: 2 000 FCFA\n" +
      `  🔗 Réserver: ${shuttleLink}\n` +
      "• Navette hôtels: 3 000 FCFA\n" +
      "• Départ toutes les 30 minutes\n\n" +
      "🚗 *Location de Voiture*\n" +
      "• Hertz, Avis, Europcar au terminal\n" +
      "• Réservation en ligne disponible\n\n" +
      "🇬🇧 *Transport services from Dakar airport available 24/7!*",
  };
}

/**
 * Payment: show supported methods and generate help info.
 */
function buildPaymentResponse(aiResult: AIResult): BotResponse {
  const providers = getAvailableProviders();
  const providerList = providers
    .map((p) => `• ${getProviderLabel(p.id)} — ${p.description}`)
    .join("\n");

  return {
    type: "text",
    text:
      "💳 *Aide Paiement — MAELLIS*\n\n" +
      "Nous acceptons plusieurs modes de paiement :\n\n" +
      providerList +
      "\n\n" +
      "🇫🇷 *En cas de problème :*\n" +
      "• Vérifiez vos informations de carte\n" +
      "• Assurez-vous d'avoir les fonds nécessaires\n" +
      "• Contactez votre banque si le paiement est refusé\n\n" +
      "🇬🇧 *If payment fails:*\n" +
      "• Check your card details\n" +
      "• Ensure sufficient funds\n" +
      "• Contact your bank if declined\n\n" +
      "📞 *Support :* +221 33 XXX XXXX\n" +
      "📧 *Email :* support@maellis.sn",
  };
}

// ============================================================================
// Static Response Builders (no service calls needed)
// ============================================================================

/**
 * Language-aware greeting response.
 */
function buildGreetingResponse(language: string): string {
  const greetings: Record<string, string> = {
    fr: "Bonjour ! Comment puis-je vous aider aujourd'hui ?",
    en: "Hello! How can I help you today?",
    wo: "Na nga def? Naka la ñu ci doole?",
    ar: "مرحبا! كيف يمكنني مساعدتك اليوم؟",
  };

  const langGreeting = greetings[language] || greetings.fr;

  return (
    "✈️ *Bienvenue à MAELLIS — Aéroport de Dakar* ✈️\n\n" +
    `${langGreeting}\n\n` +
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
    "   « Statut du vol 2S221 »\n" +
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

function buildBaggageResponse(): string {
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
// Flight Data Formatters
// ============================================================================

function formatFlightResults(
  flights: Array<{
    airline: string;
    flightNumber: string;
    departureTime: string;
    arrivalTime: string;
    departureGate: string;
    arrivalGate: string;
    status: string;
    isDelayed: boolean;
    delayMinutes: number;
  }>,
  from: string,
  to: string,
): string {
  const statusEmoji = (status: string, delayed: boolean) => {
    if (delayed) return "⚠️";
    switch (status) {
      case "active": return "🟢";
      case "landed": return "✅";
      case "cancelled": return "❌";
      default: return "🕐";
    }
  };

  const flightLines = flights
    .slice(0, 5)
    .map((f, i) => {
      const delay = f.isDelayed ? ` (⏱️ +${f.delayMinutes}min)` : "";
      return (
        `\n${i + 1}. ✈️ *${f.airline} ${f.flightNumber}* ${statusEmoji(f.status, f.isDelayed)}\n` +
        `   🛫 Départ: ${f.departureTime} | Porte: ${f.departureGate}\n` +
        `   🛬 Arrivée: ${f.arrivalTime} | Porte: ${f.arrivalGate}\n` +
        `   📋 Statut: ${f.status.toUpperCase()}${delay}`
      );
    })
    .join("\n");

  const source = process.env.AVIATION_STACK_KEY ? "AviationStack API" : "données simulées";

  return (
    "✈️ *Résultats de Vol* — " + source + "\n\n" +
    `🛫 ${from} → 🛬 ${to}\n\n` +
    flightLines +
    "\n\n" +
    "💡 Tapez le numéro de vol pour plus de détails.\n" +
    "🔄 Pour actualiser, renvoyez votre recherche."
  );
}

function formatFlightStatus(status: {
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
}): string {
  const statusMap: Record<string, string> = {
    scheduled: "🕐 Planifié",
    active: "🟢 En vol",
    landed: "✅ Atterri",
    delayed: "⚠️ Retardé",
    cancelled: "❌ Annulé",
    diverted: "🔄 Dévié",
  };

  const statusText = statusMap[status.status] || status.status;
  const delayText = status.isDelayed
    ? `\n⏱️ *Retard:* ${status.delayMinutes} minutes`
    : "";

  const source = process.env.AVIATION_STACK_KEY ? "AviationStack API" : "données simulées";

  return (
    "🔍 *Statut de Vol* — " + source + "\n\n" +
    `✈️ *${status.airline} ${status.flightNumber}*\n` +
    `🛫 ${status.origin} → 🛬 ${status.destination}\n\n` +
    `📋 *Statut:* ${statusText}${delayText}\n\n` +
    `🕐 Départ: ${status.departureTime}\n` +
    `🕐 Arrivée: ${status.arrivalTime}\n` +
    (status.gate ? `🚪 Porte: ${status.gate}\n` : "") +
    (status.terminal ? `🏢 Terminal: ${status.terminal}\n` : "") +
    "\n💡 Les informations sont mises à jour en temps réel."
  );
}
