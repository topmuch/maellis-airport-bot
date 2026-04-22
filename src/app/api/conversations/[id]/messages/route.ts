import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface MessagePayload {
  role: string
  content: string
  intent?: string
  entities?: unknown
  language?: string
  metadata?: unknown
}

// GET /api/conversations/[id]/messages — List all messages for a conversation
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
    const { id } = await params
    const body = (await request.json()) as MessagePayload

    // Validate required fields
    if (!body.role || !body.content) {
      return NextResponse.json(
        { error: 'role and content are required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['user', 'assistant', 'system', 'agent']
    if (!validRoles.includes(body.role)) {
      return NextResponse.json(
        { error: `role must be one of: ${validRoles.join(', ')}` },
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

    // Create the message
    const message = await db.conversationMessage.create({
      data: {
        conversationId: id,
        role: body.role,
        content: body.content,
        intent: body.intent ?? null,
        entities: body.entities ? JSON.stringify(body.entities) : null,
        language: body.language ?? null,
        metadata: body.metadata ? JSON.stringify(body.metadata) : null,
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
