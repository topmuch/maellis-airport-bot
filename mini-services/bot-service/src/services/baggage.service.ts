// ============================================================================
// MAELLIS Airport Bot — Baggage Service (JWT-Signed QR Code Generation)
// ============================================================================

import type { BaggageQRParams, BaggageQRResult, BaggageVerification } from "../types";

if (!process.env.JWT_SECRET) {
  console.error('[SECURITY] JWT_SECRET is required. Baggage QR tokens cannot be generated securely.')
  process.exit(1)
}

// ---- JWT Implementation (no external library needed for Bun) ----

function base64UrlEncode(data: string): string {
  return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(data: string): string {
  // Restore standard base64 padding
  let padded = data.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4 !== 0) padded += "=";
  return atob(padded);
}

/**
 * Create a simple HMAC-SHA256 JWT token using Bun's Web Crypto API.
 */
async function createJWT(payload: object, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const expPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(expPayload));

  const signingInput = `${headerB64}.${payloadB64}`;

  // Encode the secret to Uint8Array
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  // Sign the header.payload
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signingInput),
  );

  // Convert ArrayBuffer to base64url
  const signatureArray = new Uint8Array(signatureBuffer);
  const signatureB64 = base64UrlEncode(String.fromCharCode(...signatureArray));

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

/**
 * Verify a JWT token and return its payload if valid.
 * Returns null if the token is expired, malformed, or has an invalid signature.
 */
async function verifyJWT(token: string, secret: string): Promise<object | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode the payload
    const payload = JSON.parse(base64UrlDecode(payloadB64));

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token expired
    }

    // Verify signature
    const signingInput = `${headerB64}.${payloadB64}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    // Decode the signature from base64url back to Uint8Array
    const signatureStr = base64UrlDecode(signatureB64);
    const signatureBytes = Uint8Array.from(signatureStr, (c) => c.charCodeAt(0));

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(signingInput),
    );

    if (!isValid) return null;

    return payload;
  } catch {
    return null;
  }
}

// ---- Public API ----

/**
 * Generate a JWT-signed QR code for baggage tracking.
 * Returns a token, tracking URL, and informational message.
 */
export async function generateBaggageQR(params: BaggageQRParams): Promise<BaggageQRResult> {
  const jwtSecret = process.env.JWT_SECRET;

  // Generate JWT token
  const token = await createJWT(
    {
      passengerName: params.passengerName,
      phone: params.phone,
      flightNumber: params.flightNumber,
      pnr: params.pnr,
      destination: params.destination,
      type: "baggage_claim",
    },
    jwtSecret,
  );

  // Generate tracking URL
  const publicUrl = process.env.PUBLIC_URL || "https://api.maellis.aero";
  const trackingUrl = `${publicUrl}/track/${token}`;

  const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const formattedExpiry = validUntil.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return {
    token,
    trackingUrl,
    message:
      `🧳 *QR Code bagage généré pour ${params.passengerName}*\n\n` +
      `✈️ Vol: ${params.flightNumber}\n` +
      `📍 Destination: ${params.destination}\n` +
      `🎫 PNR: ${params.pnr}\n` +
      `📅 Valide jusqu'au: ${formattedExpiry}\n\n` +
      `📎 *Lien de suivi:*\n${trackingUrl}\n\n` +
      `ℹ️ Scannez ce QR code aux bornes pour un dépôt rapide.\n` +
      `📱 Conservez ce lien pour suivre votre bagage en temps réel.`,
    validUntil: validUntil.toISOString(),
  };
}

/**
 * Verify a baggage QR token.
 * Returns the baggage verification data if the token is valid, null otherwise.
 */
export async function verifyBaggageToken(
  token: string,
): Promise<BaggageVerification | null> {
  const jwtSecret = process.env.JWT_SECRET;
  const payload = await verifyJWT(token, jwtSecret);

  if (!payload || (payload as Record<string, string>).type !== "baggage_claim") {
    return null;
  }

  return payload as unknown as BaggageVerification;
}

/**
 * Format a baggage verification result into a WhatsApp-friendly message.
 */
export function formatBaggageVerification(
  verification: BaggageVerification,
): string {
  const status = verification.exp > Math.floor(Date.now() / 1000) ? "✅ Valide" : "❌ Expiré";
  const validDate = new Date(verification.exp * 1000).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    `🧳 *Vérification Bagage — MAELLIS*\n\n` +
    `Status: ${status}\n\n` +
    `👤 Passager: ${verification.passengerName}\n` +
    `📱 Téléphone: ${verification.phone}\n` +
    `✈️ Vol: ${verification.flightNumber}\n` +
    `🎫 PNR: ${verification.pnr}\n` +
    `📍 Destination: ${verification.destination}\n` +
    `📅 Expire le: ${validDate}`
  );
}
