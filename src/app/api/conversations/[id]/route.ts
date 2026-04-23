import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface ConversationUpdatePayload {
  status?: string
  intent?: string
  resolved?: boolean
}

// GET /api/conversations/[id] — Get single conversation with user info and message count
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
    const { id } = await params
    const body = (await request.json()) as ConversationUpdatePayload

    // Build update data from provided fields only
    const updateData: Record<string, unknown> = {}
    if (body.status !== undefined) updateData.status = body.status
    if (body.intent !== undefined) updateData.intent = body.intent
    if (body.resolved !== undefined) updateData.resolved = body.resolved

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
