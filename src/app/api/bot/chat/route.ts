import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const BOT_SERVICE_URL = 'http://localhost:3005';

/**
 * POST /api/bot/chat — Proxy route to the MAELLIS bot service (port 3005)
 *
 * Accepts: { message: string, phone?: string }
 * Returns: Bot response with intent classification and WhatsApp-formatted response
 *
 * Also stores conversation data in the database when a phone number is provided.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { message, phone } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Field "message" is required and must be a string' },
        { status: 400 },
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message too long. Maximum 2000 characters.' },
        { status: 400 },
      );
    }

    // Forward to bot service on port 3005
    const proxyBody: Record<string, string> = { message };
    if (phone && typeof phone === 'string') {
      proxyBody.phone = phone;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let data: Record<string, unknown>;
    let serviceAvailable = true;

    try {
      const botServiceUrl = new URL('/chat', BOT_SERVICE_URL);
      const response = await fetch(botServiceUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proxyBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Bot service error: ${response.status} — ${errorText}`);
        serviceAvailable = false;

        // Return fallback response when bot service is unreachable
        data = getFallbackResponse(message);
      } else {
        data = (await response.json()) as Record<string, unknown>;
      }
    } catch (fetchErr) {
      clearTimeout(timeoutId);

      if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
        console.error('Bot service timeout');
        serviceAvailable = false;
      } else {
        console.error('Failed to reach bot service:', fetchErr);
        serviceAvailable = false;
      }

      data = getFallbackResponse(message);
    }

    // Store in database (non-blocking, don't await)
    if (phone) {
      const responseTime = Date.now() - startTime;
      storeConversation(phone, message, data, responseTime).catch(console.error);
    }

    return NextResponse.json({
      ...data,
      _serviceAvailable: serviceAvailable,
    });
  } catch (err) {
    console.error('Error in /api/bot/chat:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Fallback response when the bot service is unreachable.
 * Provides a generic helpful response so the user isn't left hanging.
 */
function getFallbackResponse(message: string): Record<string, unknown> {
  const lowerMessage = message.toLowerCase();

  // Simple keyword-based fallback responses
  if (lowerMessage.includes('vol') || lowerMessage.includes('flight') || lowerMessage.includes('vols')) {
    return {
      response:
        '🛫 *Recherche de vols*\n\nJe recherche les meilleurs vols pour vous. ' +
        'Veuillez préciser votre aéroport de départ, de destination et la date de voyage.\n\n' +
        '📋 Exemple: "Je veux un vol de Abidjan à Paris le 15 mars"',
      intent: 'flight_search',
      fallback: true,
    };
  }

  if (lowerMessage.includes('bagage') || lowerMessage.includes('baggage') || lowerMessage.includes('colis')) {
    return {
      response:
        '🧳 *Suivi de bagages*\n\nPour suivre vos bagages, veuillez fournir votre numéro de billet (PNR) ' +
        'ou le numéro de votre carte d\'embarquement.\n\n' +
        '📋 Exemple: "Suivre mon bagage PNR ABC123"',
      intent: 'baggage_tracking',
      fallback: true,
    };
  }

  if (lowerMessage.includes('paiement') || lowerMessage.includes('payment') || lowerMessage.includes('payer')) {
    return {
      response:
        '💳 *Paiement*\n\nPour effectuer un paiement, veuillez indiquer le montant et la méthode de paiement souhaitée.\n\n' +
        '📱 Paiement mobile: MTN Mobile Money, Orange Money, Moov Money',
      intent: 'payment',
      fallback: true,
    };
  }

  if (lowerMessage.includes('urgence') || lowerMessage.includes('emergency') || lowerMessage.includes('aide') || lowerMessage.includes('sos')) {
    return {
      response:
        '🚨 *Centre d\'assistance*\n\nEn cas d\'urgence à l\'aéroport, contactez:\n\n' +
        '📞 +225 00 00 00 00\n' +
        '📞 +225 00 00 00 01\n\n' +
        'Notre équipe est disponible 24h/24 et 7j/7.',
      intent: 'emergency',
      fallback: true,
    };
  }

  return {
    response:
      '✈️ *Bienvenue à MAELLIS Airport Bot*\n\n' +
      'Je suis votre assistant virtuel pour l\'aéroport. Comment puis-je vous aider?\n\n' +
      '🔍 *Recherche de vols* — "Je cherche un vol"\n' +
      '🧳 *Suivi bagages* — "Où est mon bagage?"\n' +
      '💳 *Paiement* — "Je veux payer"\n' +
      '🚨 *Urgence* — "J\'ai besoin d\'aide"\n' +
      '🛋️ *Salon VIP* — "Réserver un salon"\n' +
      '🚕 *Transport* — "Réserver un taxi"',
    intent: 'general',
    fallback: true,
  };
}

/**
 * Store conversation data in the database (non-blocking).
 * Finds or creates a User, then appends messages as JSON to the Conversation.
 */
async function storeConversation(
  phone: string,
  userMessage: string,
  botResponse: Record<string, unknown>,
  responseTime: number,
) {
  try {
    // Find or create user
    const user = await db.user.upsert({
      where: { phone },
      create: { phone, lastSeen: new Date() },
      update: { lastSeen: new Date() },
    });

    // Find or create conversation for this user
    const conversation = await db.conversation.upsert({
      where: {
        id: `${user.id}-default`,
      },
      create: {
        id: `${user.id}-default`,
        userId: user.id,
        status: 'active',
        lastMessage: new Date(),
        messages: '[]',
      },
      update: {
        lastMessage: new Date(),
        status: 'active',
      },
    });

    // Build message entries
    const userMsg = {
      direction: 'incoming',
      content: userMessage,
      messageType: 'text',
      timestamp: new Date().toISOString(),
    };

    const botMsg = {
      direction: 'outgoing',
      content: typeof botResponse.response === 'string'
        ? botResponse.response
        : JSON.stringify(botResponse.response || botResponse),
      messageType: 'text',
      intent: (botResponse.intent as string) || null,
      responseTime,
      timestamp: new Date().toISOString(),
    };

    // Append to existing messages JSON
    const existing = JSON.parse(conversation.messages || '[]') as unknown[];
    const updatedMessages = [...existing, userMsg, botMsg];

    // Update conversation with new messages and intent
    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        messages: JSON.stringify(updatedMessages),
        intent: (botResponse.intent as string) || conversation.intent,
      },
    });
  } catch (dbError) {
    console.error('Failed to store conversation:', dbError);
  }
}
