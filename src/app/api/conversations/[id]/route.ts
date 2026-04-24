import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'

// ─────────────────────────────────────────────
// Input validation schemas
// ─────────────────────────────────────────────

const VALID_CONVERSATION_STATUSES = [
  'active',
  'pending',
  'closed',
  'archived',
] as const

const updateConversationSchema = z.object({
  status: z.enum(VALID_CONVERSATION_STATUSES).optional(),
  intent: z.string().max(100).optional(),
  resolved: z.boolean().optional(),
})

// GET /api/conversations/[id] — Get single conversation with user info and message count
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

    const conversation = await db.conversation.findUnique({
      where: { id },
      include: {
        user: true,
        _count: {
          select: {
            conversationMessages: true,
          },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const formatted = {
      id: conversation.id,
      userPhone: conversation.user?.phone ?? null,
      userName: conversation.user?.name ?? null,
      language: conversation.language,
      status: conversation.status,
      intent: conversation.intent,
      resolved: conversation.resolved,
      lastMessage: conversation.lastMessage,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messageCount: conversation._count.conversationMessages,
    }

    return NextResponse.json({ data: formatted })
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}

// PATCH /api/conversations/[id] — Update conversation status, intent, or resolved flag
export async function PATCH(
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
    const parsed = updateConversationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      )
    }

    // Build update data from validated fields only
    const updateData: Record<string, unknown> = {}
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status
    if (parsed.data.intent !== undefined) updateData.intent = parsed.data.intent
    if (parsed.data.resolved !== undefined) updateData.resolved = parsed.data.resolved

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update. Provide status, intent, or resolved.' },
        { status: 400 }
      )
    }

    // Verify conversation exists
    const existing = await db.conversation.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const updated = await db.conversation.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Error updating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    )
  }
}
