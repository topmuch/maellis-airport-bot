/**
 * Migration Script: Conversation → ConversationMessage (1:N normalization)
 *
 * Reads existing conversations with JSON messages in the `messages` field,
 * parses each message, and creates corresponding `ConversationMessage` records.
 *
 * Supports both formats:
 * - Legacy: { direction: "inbound"|"outbound", content: "...", intent?: "...", timestamp?: "..." }
 * - New: { role: "user"|"assistant"|"system"|"agent", content: "...", intent?: "...", timestamp?: "..." }
 *
 * Usage: bun run scripts/migrate-conversations.ts
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

interface LegacyMessage {
  role?: string
  direction?: string
  content?: string
  intent?: string
  messageType?: string
  entities?: unknown
  language?: string
  metadata?: unknown
  timestamp?: string
}

function directionToRole(direction: string): string {
  switch (direction.toLowerCase()) {
    case 'inbound':
      return 'user'
    case 'outbound':
      return 'assistant'
    case 'system':
      return 'system'
    case 'agent':
      return 'agent'
    default:
      return direction
  }
}

async function migrate() {
  console.log('🔄 Starting conversation migration...\n')

  const conversations = await db.conversation.findMany({
    select: {
      id: true,
      messages: true,
      language: true,
    },
  })

  console.log(`📊 Found ${conversations.length} conversations to process\n`)

  let totalCreated = 0
  let skipped = 0
  let errors = 0

  for (const conv of conversations) {
    try {
      // Skip empty or non-JSON messages
      if (!conv.messages || conv.messages.trim() === '' || conv.messages === '[]') {
        skipped++
        continue
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(conv.messages)
      } catch {
        console.warn(`  ⚠️  Conversation ${conv.id}: malformed JSON in messages field, skipping`)
        skipped++
        continue
      }

      if (!Array.isArray(parsed)) {
        console.warn(`  ⚠️  Conversation ${conv.id}: messages is not an array, skipping`)
        skipped++
        continue
      }

      const legacyMessages = parsed as LegacyMessage[]

      // Check if already migrated (has ConversationMessage records)
      const existingCount = await db.conversationMessage.count({
        where: { conversationId: conv.id },
      })
      if (existingCount > 0) {
        console.log(`  ⏭️  Conversation ${conv.id}: already has ${existingCount} messages, skipping`)
        skipped++
        continue
      }

      const records = legacyMessages
        .map((msg, index) => {
          // Determine role from direction or role field
          let role = msg.role || (msg.direction ? directionToRole(msg.direction) : 'user')

          // Determine content - handle both 'content' field names
          const content = msg.content
          if (!content) return null

          return {
            conversationId: conv.id,
            role,
            content,
            intent: msg.intent ?? null,
            entities: msg.entities ? JSON.stringify(msg.entities) : null,
            language: msg.language ?? conv.language,
            metadata: msg.metadata ? JSON.stringify(msg.metadata) : null,
            createdAt: msg.timestamp ? new Date(msg.timestamp) : new Date(Date.now() + index),
          }
        })
        .filter(Boolean) as Array<{
          conversationId: string
          role: string
          content: string
          intent: string | null
          entities: string | null
          language: string
          metadata: string | null
          createdAt: Date
        }>

      if (records.length === 0) {
        skipped++
        continue
      }

      await db.conversationMessage.createMany({
        data: records,
      })

      totalCreated += records.length
      console.log(`  ✅ Conversation ${conv.id}: ${records.length} messages migrated`)
    } catch (error) {
      errors++
      console.error(`  ❌ Conversation ${conv.id}: ${(error as Error).message}`)
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Migration complete!`)
  console.log(`  Total messages created: ${totalCreated}`)
  console.log(`  Conversations skipped:  ${skipped}`)
  console.log(`  Errors:                 ${errors}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

migrate()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
