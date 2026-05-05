import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// ════════════════════════════════════════════════════════════════
// WhatsApp Webhook — Meta Cloud API Integration
// ════════════════════════════════════════════════════════════════
//
// GET  : Meta webhook verification (hub.mode + hub.verify_token + hub.challenge)
// POST : Incoming WhatsApp messages from Meta Cloud API
//
// Security: The webhook verify token is stored in ExternalApiConfig.metaWebhookVerify.
// This route is PUBLIC (no auth) because Meta sends requests without auth.
// ════════════════════════════════════════════════════════════════

// ─── Zod Schemas ─────────────────────────────────────────────────────

const verificationQuerySchema = z.object({
  'hub.mode': z.enum(['subscribe']),
  'hub.verify_token': z.string().min(1),
  'hub.challenge': z.string().min(1),
})

const incomingMessageSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          field: z.string(),
          value: z.record(z.string(), z.unknown()),
        })
      ),
    })
  ),
})

const messageValueSchema = z.object({
  messaging_product: z.string().optional(),
  display_phone_number: z.string().optional(),
  recipient_id: z.string(),
  timestamp: z.string(),
  origin: z.string().optional(),
  context: z.object({
    forwarded: z.boolean().optional(),
    frequently_forwarded: z.boolean().optional(),
    gb_id: z.string().optional(),
  }).optional(),
  contacts: z.array(
    z.object({
      wa_id: z.string(),
      profile: z.object({
        name: z.string(),
      }),
    })
  ).optional(),
  messages: z.array(
    z.object({
      from: z.string(),
      id: z.string(),
      timestamp: z.string(),
      type: z.enum(['text', 'interactive', 'audio', 'image', 'video', 'document', 'sticker', 'location', 'contacts', 'reaction']),
      text: z.object({
        body: z.string(),
        preview_url: z.string().optional(),
      }).optional(),
      interactive: z.record(z.string(), z.unknown()).optional(),
      audio: z.record(z.string(), z.unknown()).optional(),
      image: z.record(z.string(), z.unknown()).optional(),
      video: z.record(z.string(), z.unknown()).optional(),
      document: z.record(z.string(), z.unknown()).optional(),
      sticker: z.record(z.string(), z.unknown()).optional(),
      location: z.record(z.string(), z.unknown()).optional(),
      contacts: z.array(z.record(z.string(), z.unknown())).optional(),
      reaction: z.object({
        emoji: z.string().optional(),
      }).optional(),
      context: z.record(z.string(), z.unknown()).optional(),
      errors: z.array(z.record(z.string(), z.unknown())).optional(),
      system: z.record(z.string(), z.unknown()).optional(),
    })
  ).optional(),
})

const BotServiceResponse = z.object({
  response: z.string(),
  intent: z.string().optional(),
  fallback: z.boolean().optional(),
})

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Get the WhatsApp webhook verify token from ExternalApiConfig.
 * Falls back to env variable META_WEBHOOK_VERIFY_TOKEN.
 */
async function getVerifyToken(): Promise<string | null> {
  try {
    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()
    const config = await db.externalApiConfig.findUnique({ where: { id: 'global' } })
    await db.$disconnect()
    return config?.metaWebhookVerify || process.env.META_WEBHOOK_VERIFY_TOKEN || null
  } catch {
    return process.env.META_WEBHOOK_VERIFY_TOKEN || null
  }
}

/**
 * Extract the text body from a WhatsApp message.
 */
function extractMessageText(messages: unknown[]): string {
  for (const msg of messages as Array<Record<string, unknown>>) {
    if (msg?.type === 'text' && msg?.text && typeof msg.text === 'object') {
      return (msg.text as Record<string, string>).body || ''
    }
    if (msg?.type === 'interactive' && msg?.interactive && typeof msg.interactive === 'object') {
      const interactive = msg.interactive as Record<string, unknown>
      if (interactive.type === 'list_reply') {
        return (interactive.list_reply as Record<string, string>).title || ''
      }
      if (interactive.type === 'button_reply') {
        return (interactive.button_reply as Record<string, string>).title || ''
      }
    }
  }
  return ''
}

/**
 * Extract sender phone number (wa_id) from a WhatsApp message entry.
 */
function extractSenderPhone(entry: unknown): string | null {
  const changes = (entry as Record<string, unknown>)?.changes
  if (!Array.isArray(changes)) return null
  for (const change of changes as Array<Record<string, unknown>>) {
    const value = change?.value as Record<string, unknown> | undefined
    const contacts = value?.contacts as Array<Record<string, unknown>> | undefined
    if (Array.isArray(contacts) && contacts.length > 0) {
      return String(contacts[0].wa_id || '') || null
    }
    const metadata = value?.metadata as Record<string, unknown> | undefined
    if (metadata?.display_phone_number) {
      return String(metadata.display_phone_number)
    }
    const messages = value?.messages as Array<Record<string, unknown>> | undefined
    if (Array.isArray(messages) && messages.length > 0) {
      return String(messages[0].from || '') || null
    }
  }
  return null
}

// ═══════════════════════════════════════════════════════════════
// GET — Webhook Verification (Meta subscribe flow)
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Parse verification query parameters
  const parsed = verificationQuerySchema.safeParse({
    'hub.mode': searchParams.get('hub.mode'),
    'hub.verify_token': searchParams.get('hub.verify_token'),
    'hub.challenge': searchParams.get('hub.challenge'),
  })

  if (!parsed.success) {
    console.error('[WHATSAPP WEBHOOK] Invalid verification request:', parsed.error.issues)
    return NextResponse.json(
      { error: 'Invalid verification parameters' },
      { status: 400 },
    )
  }

  if (parsed.data['hub.mode'] !== 'subscribe') {
    return NextResponse.json(
      { error: 'Unsupported hub.mode' },
      { status: 403 },
    )
  }

  const verifyToken = await getVerifyToken()

  if (!verifyToken) {
    console.error('[WHATSAPP WEBHOOK] No verify token configured (check ExternalApiConfig.metaWebhookVerify or META_WEBHOOK_VERIFY_TOKEN env)')
    return NextResponse.json(
      { error: 'Webhook verify token not configured' },
      { status: 500 },
    )
  }

  if (parsed.data['hub.verify_token'] !== verifyToken) {
    console.warn('[WHATSAPP WEBHOOK] Verify token mismatch (possible unauthorized attempt)')
    return NextResponse.json(
      { error: 'Invalid verify token' },
      { status: 403 },
    )
  }

  // Token matches — return the challenge
  console.log('[WHATSAPP WEBHOOK] Verification successful')

  return new NextResponse(parsed.data['hub.challenge'], {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ═══════════════════════════════════════════════════════════════
// POST — Incoming WhatsApp Message
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    console.log('[WHATSAPP WEBHOOK] Received message, entry count:', Array.isArray(body?.entry) ? body.entry.length : 0)

    // Validate basic structure
    const messageData = incomingMessageSchema.safeParse(body)
    if (!messageData.success) {
      console.error('[WHATSAPP WEBHOOK] Invalid message format:', messageData.error.issues)
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 },
      )
    }

    const entries = messageData.data.entry
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ status: 200, message: 'No entries to process' })
    }

    // Process each entry (each entry = one phone number conversation)
    const processedCount = { total: 0, withMessages: 0, forwarded: 0, failed: 0 }

    for (const entry of entries) {
      processedCount.total++

      const changes = entry.changes as Array<Record<string, unknown>>
      if (!Array.isArray(changes)) continue

      for (const change of changes) {
        const value = change.value as Record<string, unknown> | undefined
        const messages = value?.messages as Array<Record<string, unknown>> | undefined
        if (!Array.isArray(messages) || messages.length === 0) continue

        processedCount.withMessages++
        const phone = extractSenderPhone(entry)
        const messageText = extractMessageText(messages)

        if (!phone || !messageText.trim()) {
          processedCount.failed++
          continue
        }

        console.log(`[WHATSAPP WEBHOOK] Processing message from ${phone}: "${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}"`)

        // Forward to bot service
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 15000)

          const botResponse = await fetch('http://localhost:3005/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: messageText, phone }),
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (botResponse.ok) {
            const data = await botResponse.json()
            const validated = BotServiceResponse.safeParse(data)

            if (validated.success) {
              console.log(`[WHATSAPP WEBHOOK] Bot responded with intent: ${validated.data.intent || 'unknown'}, fallback: ${validated.data.fallback || false}`)

              // Store conversation (non-blocking)
              storeConversation(phone, messageText, validated.data).catch(console.error)

              processedCount.forwarded++
            } else {
              console.warn('[WHATSAPP WEBHOOK] Bot response validation failed')
              processedCount.failed++
            }
          } else {
            console.error(`[WHATSAPP WEBHOOK] Bot service error: ${botResponse.status}`)
            processedCount.failed++

            // Store the incoming message even if bot fails
            storeConversation(phone, messageText, {
              response: '⚠️ Service temporairement indisponible. Notre équipe vous répondra sous peu.',
              intent: 'bot_service_down',
              fallback: true,
            }).catch(console.error)
          }
        } catch (fetchErr) {
          console.error('[WHATSAPP WEBHOOK] Bot service unreachable:', fetchErr instanceof Error ? fetchErr.message : fetchErr)
          processedCount.failed++

          // Fallback: store message for later processing
          storeConversation(phone, messageText, {
            response: '⚠️ Service temporairement indisponible. Notre équipe vous répondra sous peu.',
            intent: 'bot_service_down',
            fallback: true,
          }).catch(console.error)
        }
      }
    }

    const processingTime = Date.now() - startTime
    console.log(`[WHATS WEBHOOK] Processed ${entries.length} entries in ${processingTime}ms. Results:`, processedCount)

    return NextResponse.json({
      status: 'ok',
      processed: processedCount,
      processingTimeMs: processingTime,
    })
  } catch (error) {
    console.error('[WHATSAPP WEBHOOK] Error processing incoming message:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 },
    )
  }
}

// ─── Non-blocking Conversation Storage ─────────────────────────────────

async function storeConversation(
  phone: string,
  userMessage: string,
  botResponse: Record<string, unknown>,
): Promise<void> {
  try {
    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()

    // Find or create user
    const user = await db.user.upsert({
      where: { phone },
      create: {
        id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        phone,
        lastSeen: new Date(),
        updatedAt: new Date(),
      },
      update: { lastSeen: new Date() },
    })

    // Find or create conversation
    const conversation = await db.conversation.upsert({
      where: { id: `${user.id}-whatsapp` },
      create: {
        id: `${user.id}-whatsapp`,
        userId: user.id,
        status: 'active',
        lastMessage: new Date(),
        messages: '[]',
        updatedAt: new Date(),
      },
      update: { lastMessage: new Date(), status: 'active' },
    })

    // Append messages
    const existing = JSON.parse(conversation.messages || '[]') as unknown[]
    const updatedMessages = [
      ...existing,
      {
        direction: 'incoming',
        content: userMessage,
        messageType: 'text',
        timestamp: new Date().toISOString(),
        source: 'whatsapp',
      },
      {
        direction: 'outgoing',
        content: typeof botResponse.response === 'string'
          ? botResponse.response
          : JSON.stringify(botResponse.response || ''),
        messageType: 'text',
        intent: (botResponse.intent as string) || null,
        source: 'whatsapp',
        timestamp: new Date().toISOString(),
      },
    ]

    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        messages: JSON.stringify(updatedMessages),
        intent: (botResponse.intent as string) || conversation.intent,
      },
    })

    await db.$disconnect()
  } catch (dbError) {
    console.error('[WHATSAPP WEBHOOK] Failed to store conversation:', dbError)
  }
}
