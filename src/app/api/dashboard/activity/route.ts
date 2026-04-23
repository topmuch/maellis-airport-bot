import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── GET /api/dashboard/activity?page=1&limit=5 ────────────────────────────
// Returns recent conversations with user info
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '5')))

    const conversations = await db.conversation.findMany({
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            phone: true,
            name: true,
          },
        },
      },
    })

    const total = await db.conversation.count()

    const data = conversations.map((conv) => {
      const now = new Date()
      const updatedAt = new Date(conv.updatedAt)
      const diffMs = now.getTime() - updatedAt.getTime()
      const diffMin = Math.floor(diffMs / 60000)
      const diffHour = Math.floor(diffMs / 3600000)
      const diffDay = Math.floor(diffMs / 86400000)

      let time: string
      if (diffMin < 1) time = "à l'instant"
      else if (diffMin < 60) time = `il y a ${diffMin} min`
      else if (diffHour < 24) time = `il y a ${diffHour}h`
      else time = `il y a ${diffDay}j`

      return {
        id: conv.id,
        phone: conv.user?.phone || '—',
        name: conv.user?.name || 'Inconnu',
        intent: conv.intent || 'general',
        language: (conv.language || 'FR').toUpperCase(),
        status: conv.status || 'active',
        time,
      }
    })

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('[dashboard/activity] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity data' },
      { status: 500 },
    )
  }
}
