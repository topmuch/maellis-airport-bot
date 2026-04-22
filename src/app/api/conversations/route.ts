import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/conversations - List conversations with user info
export async function GET() {
  try {
    const conversations = await db.conversation.findMany({
      orderBy: { lastMessage: 'desc' },
      include: {
        user: true,
        _count: {
          select: {
            conversationMessages: true,
          },
        },
      },
    })

    const formatted = conversations.map((conv) => ({
      id: conv.id,
      userPhone: conv.user?.phone ?? null,
      userName: conv.user?.name ?? null,
      language: conv.language,
      status: conv.status,
      intent: conv.intent,
      resolved: conv.resolved,
      lastMessage: conv.lastMessage,
      messageCount: conv._count.conversationMessages,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }))

    return NextResponse.json({ data: formatted })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}
