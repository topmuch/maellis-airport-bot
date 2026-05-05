'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface UseSocketConnectionReturn {
  /** true si le socket est connecté au serveur */
  isConnected: boolean
  /** Connexion manuelle */
  connect: () => void
  /** Déconnexion manuelle */
  disconnect: () => void
  /** Last connection error, if any */
  lastError: Error | null
}

// ─── Constantes ────────────────────────────────────────────────────────────────
const WS_URL = '/?XTransformPort=3008'

// ─── Hook léger ────────────────────────────────────────────────────────────────
/**
 * Hook simple qui gère uniquement l'état de connexion au service WebSocket.
 * Utile pour afficher un indicateur vert/rouge sans logique métier.
 */
export function useSocketConnection(autoConnect = false): UseSocketConnectionReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [lastError, setLastError] = useState<Error | null>(null)
  const socketRef = useRef<Socket | null>(null)

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return

    const socketInstance: Socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    socketRef.current = socketInstance

    socketInstance.on('connect', () => {
      setIsConnected(true)
      setLastError(null)
    })

    socketInstance.on('disconnect', () => {
      setIsConnected(false)
    })

    socketInstance.on('connect_error', (err) => {
      setLastError(err)
      if (process.env.NODE_ENV === 'development') {
        console.error('[WS] Connection error:', err.message)
      }
    })

    socketInstance.on('error', (err) => {
      setLastError(err instanceof Error ? err : new Error(String(err)))
    })
  }, [])

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect()
    socketRef.current = null
    setIsConnected(false)
    setLastError(null)
  }, [])

  // Connexion automatique si demandée
  useEffect(() => {
    if (autoConnect) {
      connect()
    }
    return () => {
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [autoConnect, connect])

  return { isConnected, connect, disconnect, lastError }
}

export default useSocketConnection
