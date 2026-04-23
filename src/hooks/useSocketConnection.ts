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
  const socketRef = useRef<Socket | null>(null)

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return

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
    })

    socketInstance.on('disconnect', () => {
      setIsConnected(false)
    })
  }, [])

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect()
    socketRef.current = null
    setIsConnected(false)
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

  return { isConnected, connect, disconnect }
}

export default useSocketConnection
