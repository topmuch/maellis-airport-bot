'use client'

import { useEffect, useCallback, useRef, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { dashboardKeys } from './useDashboardData'
import { useAirportSocket, type AirportSocketCallbacks } from './useAirportSocket'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RealtimeEvent {
  type: 'conversation:new' | 'conversation:message' | 'emergency:alert' | 'emergency:update' | 'stats:update'
  payload?: Record<string, unknown>
}

interface UseRealtimeDashboardOptions {
  airportCode: string
  /** Disable realtime (default: false) */
  disabled?: boolean
  /** Called when a realtime event is received */
  onEvent?: (event: RealtimeEvent) => void
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Connects to the airport WebSocket and invalidates TanStack Query
 * dashboard caches when relevant events arrive.
 *
 * Events that trigger refetch:
 * - conversation:new       → refetch KPIs + Activity
 * - conversation:message   → refetch KPIs + Activity
 * - emergency:alert        → refetch KPIs + Performance
 * - emergency:update       → refetch KPIs + Performance
 * - stats:update           → refetch everything
 */
export function useRealtimeDashboard(options: UseRealtimeDashboardOptions) {
  const { airportCode, disabled = false, onEvent } = options
  const queryClient = useQueryClient()
  const onEventRef = useRef(onEvent)

  // Keep the callback ref in sync without re-connecting
  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  // ── Build callbacks that invalidate queries ────────────────────────────────
  const handleConversationEvent = useCallback(
    (_data: unknown) => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.kpis() })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity(1, 5) })
      onEventRef.current?.({
        type: 'conversation:new',
      })
    },
    [queryClient],
  )

  const handleMessageEvent = useCallback(
    (_data: unknown) => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.kpis() })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity(1, 5) })
      onEventRef.current?.({
        type: 'conversation:message',
      })
    },
    [queryClient],
  )

  const handleEmergencyEvent = useCallback(
    (_data: unknown) => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.kpis() })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.performance() })
      onEventRef.current?.({
        type: 'emergency:alert',
      })
    },
    [queryClient],
  )

  const handleEmergencyUpdateEvent = useCallback(
    (_data: unknown) => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.kpis() })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.performance() })
      onEventRef.current?.({
        type: 'emergency:update',
      })
    },
    [queryClient],
  )

  const handleStatsUpdate = useCallback(
    (_data: unknown) => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      onEventRef.current?.({
        type: 'stats:update',
      })
    },
    [queryClient],
  )

  // ── Socket callbacks (memoized to avoid unnecessary ref updates in useAirportSocket) ──
  const callbacks: AirportSocketCallbacks = useMemo(
    () => ({
      onConversationNew: handleConversationEvent,
      onConversationMessage: handleMessageEvent,
      onEmergencyAlert: handleEmergencyEvent,
      onEmergencyUpdate: handleEmergencyUpdateEvent,
      onStatsUpdate: handleStatsUpdate,
    }),
    [
      handleConversationEvent,
      handleMessageEvent,
      handleEmergencyEvent,
      handleEmergencyUpdateEvent,
      handleStatsUpdate,
    ],
  )

  // ── Connect socket ──────────────────────────────────────────────────────────
  const { isConnected } = useAirportSocket(
    disabled ? '' : airportCode,
    disabled ? {} : callbacks,
  )

  return { isConnected }
}
