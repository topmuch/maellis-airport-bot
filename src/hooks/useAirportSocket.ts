'use client'

import { useCallback, useEffect, useState, useRef } from 'react'

interface UseAirportSocketOptions {
  onStatsUpdate?: (data: unknown) => void
}

export function useAirportSocket(_airportCode: string, options?: UseAirportSocketOptions) {
  const [isConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  useEffect(() => {
    // Mock hook — no real WebSocket connection.
    // In production, this would establish a WebSocket to the airport stats server.
    // For now, isConnected stays false and callbacks are ignored.

    return () => {
      cleanup()
    }
  }, [cleanup])

  // Expose isConnected as always false for mock mode
  // If a real WebSocket is later connected, this would toggle to true
  return { isConnected }
}
