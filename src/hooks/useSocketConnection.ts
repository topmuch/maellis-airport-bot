'use client'

/**
 * Mock socket connection hook.
 * Returns `isConnected: false` at all times — no real WebSocket is opened.
 * In production this would manage a persistent WebSocket connection to the
 * airport bot backend for real-time push notifications.
 */
export function useSocketConnection(_enabled: boolean = true) {
  return {
    isConnected: false,
  }
}
