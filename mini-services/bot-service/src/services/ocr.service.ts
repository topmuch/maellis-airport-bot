// ============================================================================
// MAELLIS Airport Bot — OCR Service (Bot microservice layer)
// Proxies OCR analysis to the main Next.js API (via gateway)
// Handles image messages from WhatsApp webhook
// ============================================================================

import type { OCRAnalyzeRequest, OCRAnalyzeResult } from "../types";
import { logger } from "../middleware/logger";

// ---- Main OCR API URL (via gateway) ----

// In production, this calls the Next.js API through the gateway
// The bot-service communicates via relative URLs through the Caddy gateway
const MAIN_API_BASE = process.env.MAIN_API_BASE || "http://localhost:3000";

/**
 * Analyze an image via the main API's OCR endpoint.
 * Returns extracted boarding pass data or error message.
 */
export async function analyzeImageWithOCR(params: OCRAnalyzeRequest): Promise<OCRAnalyzeResult> {
  const { imageData, phone, source = "whatsapp" } = params;

  if (!imageData) {
    return { success: false, message: "Aucune image fournie." };
  }

  try {
    const url = `${MAIN_API_BASE}/api/media/analyze`;

    logger.info(`[ocr.service] Analyzing image via ${url}`);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData, phone, source }),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error(`[ocr.service] API returned ${res.status}: ${errText}`);
      return {
        success: false,
        message: "Erreur lors de l'analyse de l'image. Veuillez réessayer.",
      };
    }

    const result = (await res.json()) as OCRAnalyzeResult;

    if (result.success && result.data) {
      logger.info(
        `[ocr.service] Scan successful: PNR=${result.data.pnr || "N/A"} Flight=${result.data.flightNumber || "N/A"} Confidence=${result.data.confidence}%`
      );
    } else {
      logger.info(`[ocr.service] Scan failed: ${result.message}`);
    }

    return result;
  } catch (error) {
    logger.error("[ocr.service] analyzeImageWithOCR failed:", String(error));
    return {
      success: false,
      message: "Service d'analyse indisponible. Veuillez saisir vos informations manuellement.",
    };
  }
}

/**
 * Format OCR result as a WhatsApp-friendly confirmation message.
 */
export function formatOCRConfirmation(result: OCRAnalyzeResult): string {
  if (!result.success || !result.data) {
    return result.message || "Je n'ai pas pu lire votre billet.";
  }

  const d = result.data;
  const lines: string[] = ["📋 *J'ai lu votre carte d'embarquement !*\n"];

  if (d.passengerName) lines.push(`👤 Passager : ${d.passengerName}`);
  if (d.airline) lines.push(`✈️ Compagnie : ${d.airline}`);
  if (d.flightNumber) lines.push(`🔢 Vol : ${d.flightNumber}`);
  if (d.flightDate) lines.push(`📅 Date : ${d.flightDate}`);
  if (d.departureCity && d.departureCode) {
    lines.push(`🛫 Départ : ${d.departureCity} (${d.departureCode})`);
  }
  if (d.arrivalCity && d.arrivalCode) {
    lines.push(`🛬 Arrivée : ${d.arrivalCity} (${d.arrivalCode})`);
  }
  if (d.seat) lines.push(`💺 Siège : ${d.seat}`);
  if (d.gate) lines.push(`🚪 Porte : ${d.gate}`);
  if (d.terminal) lines.push(`🏢 Terminal : ${d.terminal}`);
  if (d.boardingTime) lines.push(`⏰ Embarquement : ${d.boardingTime}`);
  if (d.pnr) lines.push(`🔖 PNR : ${d.pnr}`);

  lines.push("\n*C'est bien cela ?*");

  return lines.join("\n");
}

/**
 * Format the manual input fallback message.
 */
export function formatManualInputPrompt(): string {
  return (
    "📝 *Saisie manuelle des informations*\n\n" +
    "Je n'ai pas pu lire votre image automatiquement.\n\n" +
    "Veuillez me fournir :\n" +
    "• 🔖 Code PNR (6 caractères)\n" +
    "• ✈️ Numéro de vol (ex: AF724)\n" +
    "• 📅 Date du vol\n\n" +
    "*Exemple :*\n" +
    "« PNR KXH4M2 vol AF724 15/06/2025 »\n\n" +
    "🇬🇧 *Manual entry:*\n" +
    "Please provide your PNR and flight number."
  );
}
