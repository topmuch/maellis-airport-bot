// ─────────────────────────────────────────────────────────────────────────────
// MAELLIS Airport Bot — Service d'Analytics Check-in
//
// RESPONSABILITÉS :
// 1. Tracker les événements de génération de deep links
// 2. Agréger les statistiques pour le dashboard admin
// 3. Fournir les métriques par compagnie, par jour, par statut
//
// SOURCE DE DONNÉES : Table CheckInSession (Prisma)
// - Chaque session de check-in représente un événement trackable
// - Le champ checkInUrl indique si un lien a été généré avec succès
// - Le champ status permet le suivi du funnel (detected → checked_in → completed)
//
// PATTERNS :
// - Requêtes agrégées Prisma avec groupBy
// - Cache en mémoire (TTL 2 min) pour les stats admin
// - Zéro type `any`
// - Logging structuré avec prefix [checkin-analytics]
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Statistiques globales de check-in */
export interface CheckinAnalyticsOverview {
  totalSessions: number
  sessionsWithLink: number
  linkGenerationRate: number
  statusBreakdown: Array<{ status: string; count: number }>
  airlineBreakdown: Array<{ airline: string | null; count: number; withLink: number }>
  sessionsLast24h: number
  sessionsLast7d: number
  sessionsLast30d: number
}

/** Série temporelle pour les graphiques (agrégation par jour) */
export interface CheckinDailyStats {
  date: string
  totalSessions: number
  withLink: number
  withoutLink: number
}

/** Statistiques détaillées par compagnie */
export interface AirlineCheckinStats {
  iataCode: string | null
  airlineName: string | null
  totalSessions: number
  sessionsWithLink: number
  linkRate: number
  recentSessions: number
}

// ─── Cache ───────────────────────────────────────────────────────────────────

let cachedOverview: CheckinAnalyticsOverview | null = null
let overviewTimestamp = 0
const OVERVIEW_CACHE_TTL_MS = 2 * 60 * 1000 // 2 minutes

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Récupère les statistiques globales de check-in.
 * Résultats mis en cache pendant 2 minutes.
 */
export async function getCheckinAnalyticsOverview(): Promise<CheckinAnalyticsOverview> {
  const now = Date.now()
  if (cachedOverview && (now - overviewTimestamp) < OVERVIEW_CACHE_TTL_MS) {
    return cachedOverview
  }

  try {
    const [
      totalSessions,
      sessionsWithLink,
      statusBreakdown,
      airlineBreakdown,
      sessionsLast24h,
      sessionsLast7d,
      sessionsLast30d,
    ] = await Promise.all([
      // Total de sessions
      db.checkInSession.count(),

      // Sessions avec un lien de check-in généré
      db.checkInSession.count({
        where: { checkInUrl: { not: null } },
      }),

      // Répartition par statut
      db.checkInSession.groupBy({
        by: ['status'],
        _count: { status: true },
      }),

      // Répartition par compagnie
      db.checkInSession.groupBy({
        by: ['airline'],
        _count: { airline: true },
        where: { checkInUrl: { not: null } },
      }),

      // Sessions des dernières 24h
      db.checkInSession.count({
        where: {
          createdAt: { gte: new Date(now - 24 * 60 * 60 * 1000) },
        },
      }),

      // Sessions des 7 derniers jours
      db.checkInSession.count({
        where: {
          createdAt: { gte: new Date(now - 7 * 24 * 60 * 60 * 1000) },
        },
      }),

      // Sessions des 30 derniers jours
      db.checkInSession.count({
        where: {
          createdAt: { gte: new Date(now - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ])

    const result: CheckinAnalyticsOverview = {
      totalSessions,
      sessionsWithLink,
      linkGenerationRate: totalSessions > 0 ? Math.round((sessionsWithLink / totalSessions) * 100) / 100 : 0,
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count.status,
      })),
      airlineBreakdown: airlineBreakdown.map((a) => ({
        airline: a.airline,
        count: a._count.airline,
        withLink: a._count.airline, // already filtered by checkInUrl not null
      })),
      sessionsLast24h,
      sessionsLast7d,
      sessionsLast30d,
    }

    cachedOverview = result
    overviewTimestamp = now
    return result
  } catch (error) {
    console.error('[checkin-analytics] getCheckinAnalyticsOverview error:', error)
    return {
      totalSessions: 0,
      sessionsWithLink: 0,
      linkGenerationRate: 0,
      statusBreakdown: [],
      airlineBreakdown: [],
      sessionsLast24h: 0,
      sessionsLast7d: 0,
      sessionsLast30d: 0,
    }
  }
}

/**
 * Récupère les statistiques par jour pour les N derniers jours.
 * Utilisé pour les graphiques de tendance sur le dashboard.
 *
 * @param days - Nombre de jours à analyser (défaut: 30)
 */
export async function getCheckinDailyStats(
  days: number = 30,
): Promise<CheckinDailyStats[]> {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const sessions = await db.checkInSession.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        checkInUrl: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Agréger par jour
    const dailyMap = new Map<string, { total: number; withLink: number }>()

    for (const session of sessions) {
      const dateKey = session.createdAt.toISOString().slice(0, 10) // YYYY-MM-DD
      const existing = dailyMap.get(dateKey) || { total: 0, withLink: 0 }
      existing.total++
      if (session.checkInUrl) {
        existing.withLink++
      }
      dailyMap.set(dateKey, existing)
    }

    // Remplir les jours manquants avec des zéros
    const result: CheckinDailyStats[] = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dateKey = date.toISOString().slice(0, 10)
      const dayData = dailyMap.get(dateKey) || { total: 0, withLink: 0 }
      result.push({
        date: dateKey,
        totalSessions: dayData.total,
        withLink: dayData.withLink,
        withoutLink: dayData.total - dayData.withLink,
      })
    }

    return result
  } catch (error) {
    console.error('[checkin-analytics] getCheckinDailyStats error:', error)
    return []
  }
}

/**
 * Récupère les statistiques détaillées par compagnie aérienne.
 *
 * @param limit - Nombre max de compagnies à retourner (défaut: 20)
 */
export async function getCheckinAirlineStats(
  limit: number = 20,
): Promise<AirlineCheckinStats[]> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [totalByAirline, withLinkByAirline, recentByAirline] = await Promise.all([
      // Total par compagnie (tous temps)
      db.checkInSession.groupBy({
        by: ['airline'],
        _count: { airline: true },
      }),

      // Avec lien par compagnie
      db.checkInSession.groupBy({
        by: ['airline'],
        _count: { airline: true },
        where: { checkInUrl: { not: null } },
      }),

      // Sessions récentes (7j) par compagnie
      db.checkInSession.groupBy({
        by: ['airline'],
        _count: { airline: true },
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
    ])

    // Map pour lookup rapide
    const linkMap = new Map<string, number>()
    for (const item of withLinkByAirline) {
      linkMap.set(item.airline ?? 'unknown', item._count.airline)
    }

    const recentMap = new Map<string, number>()
    for (const item of recentByAirline) {
      recentMap.set(item.airline ?? 'unknown', item._count.airline)
    }

    const result: AirlineCheckinStats[] = totalByAirline
      .map((item) => {
        const key = item.airline ?? 'unknown'
        const total = item._count.airline
        const withLink = linkMap.get(key) ?? 0
        return {
          iataCode: null, // Non stocké dans CheckInSession, récupéré via le nom
          airlineName: key,
          totalSessions: total,
          sessionsWithLink: withLink,
          linkRate: total > 0 ? Math.round((withLink / total) * 100) / 100 : 0,
          recentSessions: recentMap.get(key) ?? 0,
        }
      })
      .sort((a, b) => b.totalSessions - a.totalSessions)
      .slice(0, limit)

    return result
  } catch (error) {
    console.error('[checkin-analytics] getCheckinAirlineStats error:', error)
    return []
  }
}

/**
 * Invalide le cache des statistiques globales.
 * À appeler après toute modification de CheckInSession.
 */
export function invalidateAnalyticsCache(): void {
  cachedOverview = null
  overviewTimestamp = 0
  console.info('[checkin-analytics] Cache des statistiques invalidé')
}
