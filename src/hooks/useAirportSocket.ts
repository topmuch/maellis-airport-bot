'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AirportSocketCallbacks {
  onEmergencyAlert?: (data: unknown) => void
  onEmergencyUpdate?: (data: unknown) => void
  onConversationNew?: (data: unknown) => void
  onConversationMessage?: (data: unknown) => void
  onFlightUpdate?: (data: unknown) => void
  onStatsUpdate?: (data: unknown) => void
  onNotification?: (data: unknown) => void
}

export interface UseAirportSocketReturn {
  /** Indique si la connexion Socket.io est active */
  isConnected: boolean
  /** Rejoindre une salle admin spécifique */
  joinAdmin: (userId: string, role?: string) => void
  /** Quitter une salle admin */
  leaveAdmin: (userId: string) => void
  /** Émettre un événement vers la salle aéroport (via le serveur) */
  emitToAirport: (event: string, data: unknown) => void
  /** Déconnecter manuellement le socket */
  disconnect: () => void
}

// ─── Constantes ────────────────────────────────────────────────────────────────
const WS_URL = '/?XTransformPort=3008'

// ─── Hook principal ────────────────────────────────────────────────────────────
export function useAirportSocket(
  airportCode: string,
  callbacks: AirportSocketCallbacks = {}
): UseAirportSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const callbacksRef = useRef(callbacks)

  // Synchroniser les callbacks dans un useEffect pour éviter de mettre à jour un ref pendant le render
  useEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  // ── Connexion ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!airportCode) return

    const socketInstance: Socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    socketRef.current = socketInstance

    socketInstance.on('connect', () => {
      setIsConnected(true)
      socketInstance.emit('join:airport', { airportCode })
    })

    socketInstance.on('disconnect', (reason) => {
      setIsConnected(false)
      console.warn(`[WS] Déconnecté — aéroport: ${airportCode} — raison: ${reason}`)
    })

    socketInstance.io.on('reconnect_attempt', (attempt) => {
      console.log(`[WS] Tentative de reconnexion #${attempt}…`)
    })

    socketInstance.io.on('reconnect', () => {
      console.log(`[WS] Reconnecté — aéroport: ${airportCode}`)
      socketInstance.emit('join:airport', { airportCode })
    })

    // ── Écoute des événements métier ───────────────────────────────────────────
    const eventHandlers: Array<{ event: string; handler: (data: unknown) => void }> = [
      { event: 'emergency:alert', handler: (d) => callbacksRef.current.onEmergencyAlert?.(d) },
      { event: 'emergency:update', handler: (d) => callbacksRef.current.onEmergencyUpdate?.(d) },
      { event: 'conversation:new', handler: (d) => callbacksRef.current.onConversationNew?.(d) },
      { event: 'conversation:message', handler: (d) => callbacksRef.current.onConversationMessage?.(d) },
      { event: 'flight:update', handler: (d) => callbacksRef.current.onFlightUpdate?.(d) },
      { event: 'stats:update', handler: (d) => callbacksRef.current.onStatsUpdate?.(d) },
      { event: 'notification', handler: (d) => callbacksRef.current.onNotification?.(d) },
    ]

    for (const { event, handler } of eventHandlers) {
      socketInstance.on(event, handler)
    }

    return () => {
      for (const { event, handler } of eventHandlers) {
        socketInstance.off(event, handler)
      }
      socketInstance.disconnect()
      socketRef.current = null
    }
  }, [airportCode])

  const joinAdmin = useCallback((userId: string, role: string = 'admin') => {
    socketRef.current?.emit('join:admin', { userId, role })
  }, [])

  const leaveAdmin = useCallback((userId: string) => {
    socketRef.current?.emit('leave:admin', { userId })
  }, [])

  const emitToAirport = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data)
  }, [])

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect()
  }, [])

  return { isConnected, joinAdmin, leaveAdmin, emitToAirport, disconnect }
}

export default useAirportSocket
