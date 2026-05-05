import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getPagination } from '@/lib/validate'

// GET /api/conversations - List conversations with user info
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user.success) {
      return NextResponse.json({ error: user.error }, { status: user.status })
    }

    const { searchParams } = new URL(request.url)
    const { page, limit, skip } = getPagination(searchParams)

    const conversations = await db.conversation.findMany({
      orderBy: { lastMessage: 'desc' },
      skip,
      take: limit,
      include: {
        User: true,
        _count: {
          select: {
            ConversationMessage: true,
          },
        },
      },
    })

    const formatted = conversations.map((conv) => ({
      id: conv.id,
      userPhone: conv.User?.phone ?? null,
      userName: conv.User?.name ?? null,
      language: conv.language,
      status: conv.status,
      intent: conv.intent,
      resolved: conv.resolved,
      lastMessage: conv.lastMessage,
      messageCount: conv._count.ConversationMessage,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }))

    return NextResponse.json({ data: formatted, page, limit })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}
