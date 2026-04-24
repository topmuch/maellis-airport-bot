import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { SAFETY_TAKE } from '@/lib/validate'

// ─────────────────────────────────────────────
// Input validation schemas
// ─────────────────────────────────────────────

const VALID_MESSAGE_ROLES = ['user', 'assistant', 'system', 'agent'] as const

const createMessageSchema = z.object({
  role: z.enum(VALID_MESSAGE_ROLES),
  content: z.string().min(1).max(10000),
  intent: z.string().max(100).optional(),
  entities: z.unknown().optional(),
  language: z.string().max(10).optional(),
  metadata: z.unknown().optional(),
})

// GET /api/conversations/[id]/messages — List all messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    if (!user.success) {
      return NextResponse.json({ error: user.error }, { status: user.status })
    }

    const { id } = await params

    if (!id || typeof id !== 'string' || id.length < 1 || id.length > 200) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    // Verify conversation exists
    const conversation = await db.conversation.findUnique({
      where: { id },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const messages = await db.conversationMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      take: SAFETY_TAKE,
    })

    return NextResponse.json({ data: messages })
  } catch (error) {
    console.error('Error fetching conversation messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST /api/conversations/[id]/messages — Create a new message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    if (!user.success) {
      return NextResponse.json({ error: user.error }, { status: user.status })
    }

    const { id } = await params

    if (!id || typeof id !== 'string' || id.length < 1 || id.length > 200) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const parsed = createMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      )
    }

    // Verify conversation exists
    const conversation = await db.conversation.findUnique({
      where: { id },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const data = parsed.data

    // Create the message
    const message = await db.conversationMessage.create({
      data: {
        conversationId: id,
        role: data.role,
        content: data.content,
        intent: data.intent ?? null,
        entities: data.entities ? JSON.stringify(data.entities) : null,
        language: data.language ?? null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    })

    // Update conversation's lastMessage timestamp
    await db.conversation.update({
      where: { id },
      data: { lastMessage: new Date() },
    })

    return NextResponse.json({ data: message }, { status: 201 })
  } catch (error) {
    console.error('Error creating conversation message:', error)
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    )
  }
}
