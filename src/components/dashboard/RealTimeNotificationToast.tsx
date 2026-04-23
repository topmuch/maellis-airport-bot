'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'

// ─── Types ─────────────────────────────────────────────────────────────────────

type RealTimeEventType =
  | 'emergency:alert'
  | 'emergency:update'
  | 'conversation:new'
  | 'conversation:message'
  | 'flight:update'
  | 'stats:update'
  | 'notification'

export interface RealTimeEvent {
  type: RealTimeEventType
  data: Record<string, unknown>
}

// ─── Toast helpers ─────────────────────────────────────────────────────────────

/**
 * Affiche une notification toast pour un événement temps réel.
 * Les événements `stats:update` sont silencieux (pas de toast).
 */
export function showRealTimeNotification(type: RealTimeEventType, data: Record<string, unknown>): void {
  switch (type) {
    case 'emergency:alert': {
      toast.error('🚨 Nouvelle urgence', {
        description: (data.description as string) || 'Une nouvelle alerte a été signalée.',
        duration: 6000,
      })
      break
    }
    case 'emergency:update': {
      toast.warning('⚠️ Alerte mise à jour', {
        description: `Alerte ${(data.id as string) || ''} — ${(data.status as string) || 'mise à jour'}.`,
        duration: 5000,
      })
      break
    }
    case 'conversation:new': {
      toast('💬 Nouvelle conversation', {
        description: `Numéro: ${(data.phone as string) || 'inconnu'}`,
        duration: 5000,
      })
      break
    }
    case 'flight:update': {
      toast.info('✈️ Mise à jour vol', {
        description: `Vol ${(data.flightNumber as string) || ''} — ${(data.status as string) || ''}`,
        duration: 5000,
      })
      break
    }
    case 'conversation:message':
    case 'stats:update':
    case 'notification':
    default:
      // Silencieux pour les mises à jour de stats et notifications génériques
      break
  }
}

// ─── Hook wrapper ─────────────────────────────────────────────────────────────

export function useRealTimeNotification() {
  const notify = useCallback((event: RealTimeEvent) => {
    showRealTimeNotification(event.type, event.data as Record<string, unknown>)
  }, [])

  return { notify }
}
