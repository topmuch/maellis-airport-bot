import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { matchFAQ } from '@/lib/services/faq.service';

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

        // Return intelligent FAQ fallback response when bot service is unreachable
        data = await getFAQFallbackResponse(message);
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

      data = await getFAQFallbackResponse(message);
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
 * Intelligent FAQ-based fallback when the bot service is unreachable.
 * Uses the FAQ matching system to provide relevant answers or suggestions.
 */
async function getFAQFallbackResponse(message: string): Promise<Record<string, unknown>> {
  try {
    const result = await matchFAQ(message, 'DSS');

    // Case 1: FAQ matched — return the matched answer
    if (result.matched && result.faq) {
      return {
        response: `💡 *Réponse trouvée*\n\n${result.faq.matchedAnswer}`,
        intent: 'faq_matched',
        fallback: true,
        _faqMatched: true,
        _faqScore: result.faq.score,
        _faqCategory: result.faq.faq.category,
      };
    }

    // Case 2: No exact match but suggestions available
    if (result.suggestions && result.suggestions.length > 0) {
      const numberedSuggestions = result.suggestions
        .map((s, i) => `${i + 1}. ${s}`)
        .join('\n');

      return {
        response:
          `🔍 *Recherche...*\n\n` +
          `Je n'ai pas trouvé de réponse exacte, mais voici quelques questions qui pourraient vous aider :\n\n` +
          `${numberedSuggestions}\n\n` +
          `N'hésitez pas à reformuler votre question ou à taper un de ces sujets. ✨`,
        intent: 'faq_suggestions',
        fallback: true,
        _faqMatched: false,
        _faqSuggestions: result.suggestions,
      };
    }
  } catch (faqError) {
    console.error('FAQ matching failed, using default fallback:', faqError);
  }

  // Case 3: No FAQ match or error — return default welcome message
  return getDefaultFallbackResponse();
}

/**
 * Default fallback response when FAQ matching also fails.
 */
function getDefaultFallbackResponse(): Record<string, unknown> {
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
