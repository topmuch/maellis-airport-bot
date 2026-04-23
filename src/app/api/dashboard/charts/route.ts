import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── GET /api/dashboard/charts ──────────────────────────────────────────────
// Returns traffic (7 days), intent distribution, and language breakdown
export async function GET() {
  try {
    // ── 1. Traffic: messages per day for the last 7 days ─────────────────
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

    // Get messages grouped by day for last 7 days
    const recentMessages = await db.message.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    })

    // Build traffic array
    const trafficMap: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      trafficMap[key] = 0
    }

    for (const msg of recentMessages) {
      const key = msg.createdAt.toISOString().split('T')[0]
      if (trafficMap[key] !== undefined) {
        trafficMap[key]++
      }
    }

    const traffic = Object.entries(trafficMap).map(([date, count]) => ({
      day: dayNames[new Date(date).getDay()],
      messages: count,
    }))

    // ── 2. Intent distribution from conversations ────────────────────────
    const intentGroups = await db.conversation.groupBy({
      by: ['intent'],
      where: { intent: { not: null, not: '' } },
      _count: { intent: true },
    })

    const totalIntents = intentGroups.reduce((sum, g) => sum + g._count.intent, 0)

    const intentColorMap: Record<string, string> = {
      recherche_vol: '#f97316',
      vols: '#f97316',
      bagages: '#10b981',
      baggage: '#10b981',
      transport: '#0ea5e9',
      taxi: '#0ea5e9',
      vtc: '#0ea5e9',
      lounge: '#8b5cf6',
      salon: '#8b5cf6',
      vip: '#8b5cf6',
      paiements: '#f59e0b',
      payment: '#f59e0b',
      urgence: '#f43f5e',
      emergency: '#f43f5e',
      autres: '#6b7280',
      other: '#6b7280',
      help: '#6b7280',
      aide: '#6b7280',
    }

    const intents = intentGroups
      .map((g) => ({
        name: g.intent || 'autres',
        value:
          totalIntents > 0
            ? Math.round((g._count.intent / totalIntents) * 100)
            : 0,
        fill:
          intentColorMap[g.intent.toLowerCase()] ||
          '#6b7280',
      }))
      .sort((a, b) => b.value - a.value)

    // ── 3. Language distribution ─────────────────────────────────────────
    const langGroups = await db.conversation.groupBy({
      by: ['language'],
      where: { language: { not: null, not: '' } },
      _count: { language: true },
    })

    const totalLangs = langGroups.reduce(
      (sum, g) => sum + g._count.language,
      0,
    )

    const langColorMap: Record<string, string> = {
      FR: 'bg-orange-500',
      fr: 'bg-orange-500',
      EN: 'bg-sky-500',
      en: 'bg-sky-500',
      WO: 'bg-amber-500',
      wo: 'bg-amber-500',
      AR: 'bg-violet-500',
      ar: 'bg-violet-500',
    }

    const langLabelMap: Record<string, string> = {
      FR: 'Français',
      fr: 'Français',
      EN: 'English',
      en: 'English',
      WO: 'Wolof',
      wo: 'Wolof',
      AR: 'العربية',
      ar: 'العربية',
    }

    const languages = langGroups
      .map((g) => ({
        code: g.language.toUpperCase(),
        label: langLabelMap[g.language] || g.language,
        pct:
          totalLangs > 0
            ? Math.round((g._count.language / totalLangs) * 100)
            : 0,
        color: langColorMap[g.language] || 'bg-gray-500',
      }))
      .sort((a, b) => b.pct - a.pct)

    return NextResponse.json({
      success: true,
      data: { traffic, intents, languages },
    })
  } catch (error) {
    console.error('[dashboard/charts] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chart data' },
      { status: 500 },
    )
  }
}
