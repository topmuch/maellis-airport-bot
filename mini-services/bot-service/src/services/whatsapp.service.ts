// ============================================================================
// MAELLIS Airport Bot — WhatsApp Cloud API Service (Meta v18.0)
// ============================================================================

import type { BotResponse, WhatsAppWebhookPayload } from "../types";

const WHATSAPP_API_VERSION = "v18.0";

/**
 * Send a message via Meta WhatsApp Cloud API.
 * Gracefully skips if WHATSAPP_ACCESS_TOKEN is not configured.
 */
export async function sendWhatsAppMessage(
  to: string,
  response: BotResponse,
): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_ID;

  if (!accessToken || !phoneNumberId) {
    console.log("⚠️  WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_ID not set — skipping send");
    return;
  }

  const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to,
    type: response.type,
    ...(response.type === "text"
      ? { text: { body: response.text!, preview_url: false } }
      : { interactive: response.interactive }),
  };

  try {
    const res = await fetch(WHATSAPP_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("❌ WhatsApp API Error:", JSON.stringify(err));
      throw new Error(`WhatsApp API error: ${res.status}`);
    }

    console.log(`✅ Message sent to ${to}`);
  } catch (err) {
    console.error("❌ Failed to send WhatsApp message:", err);
    throw err;
  }
}

/**
 * Verify the webhook with Meta (GET /webhook).
 * Returns the challenge string if verification succeeds, null otherwise.
 */
export function verifyWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null,
): { verified: boolean; challenge: string } {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "maellis_test_token";

  if (mode === "subscribe" && token === verifyToken && challenge) {
    console.log("✅ Webhook verified with Meta");
    return { verified: true, challenge };
  }

  console.log("❌ Webhook verification failed");
  return { verified: false, challenge: "" };
}

/**
 * Parse an incoming Meta WhatsApp Cloud API webhook payload.
 * Extracts phone number, message text, and message type.
 */
export function parseWebhookPayload(body: unknown): {
  phone: string | null;
  messageText: string;
  messageType: string;
  profileName?: string;
} {
  const payload = body as WhatsAppWebhookPayload;
  if (!payload?.entry?.length) {
    return { phone: null, messageText: "", messageType: "unknown" };
  }

  for (const entry of payload.entry) {
    // Extract contact profile name if available
    let profileName: string | undefined;
    const contacts = entry.changes?.[0]?.value?.contacts;
    if (contacts?.length) {
      profileName = contacts[0].profile?.name;
    }

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
      } else if (msg.type === "image" || msg.type === "document" || msg.type === "audio") {
        text = `[${msg.type} message received]`;
      }

      return {
        phone: msg.from,
        messageText: text,
        messageType: type,
        profileName,
      };
    }
  }

  return { phone: null, messageText: "", messageType: "unknown" };
}

/**
 * Check if WhatsApp credentials are configured.
 */
export function isWhatsAppConfigured(): boolean {
  return !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_ID);
}
