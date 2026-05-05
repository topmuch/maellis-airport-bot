import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// ── GET /api/dashboard/performance ─────────────────────────────────────────
// Returns resolution rate, average response time, target time
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 })
  }
  try {
    // ── 1. Resolution Rate ───────────────────────────────────────────────
    const totalConversations = await db.conversation.count()
    const resolvedConversations = await db.conversation.count({
      where: { status: 'closed' },
    })

    const resolutionRate =
      totalConversations > 0
        ? Math.round((resolvedConversations / totalConversations) * 100) / 100
        : 0

    // ── 2. Average Response Time ─────────────────────────────────────────
    // Calculate from conversation messages: time between user message and bot response
    const recentConversations = await db.conversation.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    let totalResponseTime = 0
    let responseCount = 0

    for (const conv of recentConversations) {
      // Get messages for this conversation using ConversationMessage
      const msgs = await db.conversationMessage.findMany({
        where: { conversationId: conv.id },
        orderBy: { createdAt: 'asc' },
        take: 20, // only check first 20 messages
      })

      for (let i = 0; i < msgs.length - 1; i++) {
        const current = msgs[i]
        const next = msgs[i + 1]

        // User sends message, bot responds
        if (
          current.role === 'user' &&
          next.role === 'assistant' &&
          current.createdAt &&
          next.createdAt
        ) {
          const diffMs =
            next.createdAt.getTime() - current.createdAt.getTime()
          // Only count reasonable response times (< 60 seconds)
          if (diffMs >= 0 && diffMs < 60000) {
            totalResponseTime += diffMs / 1000
            responseCount++
          }
        }
      }
    }

    const avgResponseTime =
      responseCount > 0
        ? Math.round((totalResponseTime / responseCount) * 10) / 10
        : 0

    const targetTime = 2.0

    // ── 3. Sparkline data: response times over last 12 interactions ──────
    // Get latest bot responses for sparkline
    const allMessages = await db.conversationMessage.findMany({
      where: { role: 'assistant' },
      orderBy: { createdAt: 'desc' },
      take: 24,
      select: { conversationId: true, createdAt: true },
    })

    const sparkline: number[] = []
    // Process in reverse to get chronological order
    for (let i = allMessages.length - 1; i >= 1; i -= 2) {
      const botMsg = allMessages[i]
      // Find preceding user message
      const userMsgs = await db.conversationMessage.findFirst({
        where: {
          conversationId: botMsg.conversationId,
          role: 'user',
          createdAt: { lt: botMsg.createdAt },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (userMsgs && userMsgs.createdAt) {
        const diffSec = (botMsg.createdAt.getTime() - userMsgs.createdAt.getTime()) / 1000
        if (diffSec >= 0 && diffSec < 60) {
          sparkline.push(diffSec)
        }
      }
      if (sparkline.length >= 12) break
    }

    // Normalize sparkline to percentages (max = 100)
    const maxSparkline = Math.max(...sparkline, 1)
    const sparklineNormalized = sparkline.map((v) =>
      Math.round((v / maxSparkline) * 100),
    )

    return NextResponse.json({
      success: true,
      data: {
        resolutionRate,
        avgResponseTime,
        targetTime,
        totalConversations,
        resolvedConversations,
        sparkline: sparklineNormalized,
      },
    })
  } catch (error) {
    console.error('[dashboard/performance] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch performance data' },
      { status: 500 },
    )
  }
}
