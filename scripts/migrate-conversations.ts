/**
 * Migration Script: Conversation → ConversationMessage (1:N normalization)
 *
 * Reads existing conversations with JSON messages in the `messages` field,
 * parses each message, and creates corresponding `ConversationMessage` records.
 *
 * Usage: bun run scripts/migrate-conversations.ts
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

interface LegacyMessage {
  role?: string
  content?: string
  intent?: string
  entities?: unknown
  language?: string
  metadata?: unknown
  timestamp?: string
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
      const validMessages = legacyMessages.filter(
        (m) => m.role && m.content
      )

      if (validMessages.length === 0) {
        skipped++
        continue
      }

      const now = new Date()
      const records = validMessages.map((msg, index) => ({
        conversationId: conv.id,
        role: msg.role!,
        content: msg.content!,
        intent: msg.intent ?? null,
        entities: msg.entities ? JSON.stringify(msg.entities) : null,
        language: msg.language ?? conv.language,
        metadata: msg.metadata ? JSON.stringify(msg.metadata) : null,
        createdAt: msg.timestamp ? new Date(msg.timestamp) : new Date(now.getTime() + index),
      }))

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
