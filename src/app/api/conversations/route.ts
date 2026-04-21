import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/conversations - List conversations with message counts
export async function GET() {
  try {
    const conversations = await db.conversation.findMany({
      orderBy: { lastMessage: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    })

    const formatted = conversations.map((conv) => ({
      id: conv.id,
      userPhone: conv.userPhone,
      userName: conv.userName,
      language: conv.language,
      status: conv.status,
      lastMessage: conv.lastMessage,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messageCount: conv._count.messages,
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
