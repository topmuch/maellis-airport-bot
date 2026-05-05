import { NextRequest } from 'next/server'
import { getActiveAlerts } from '@/lib/services/broadcast-alert.service'

// GET /api/broadcast/stream — SSE endpoint for real-time alert updates
// Polls every 3 seconds and pushes active alerts to connected clients
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = async () => {
        try {
          const activeAlerts = await getActiveAlerts()
          const data = activeAlerts.map((a) => ({
            ...a,
            channels: JSON.parse(a.channels || '[]'),
            scopeFilter: a.scopeFilter ? JSON.parse(String(a.scopeFilter)) : null,
          }))

          const event = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(event))
        } catch {
          // Keep stream alive even if error occurs
          const errorEvent = `data: ${JSON.stringify([])}\n\n`
          controller.enqueue(encoder.encode(errorEvent))
        }
      }

      // Send immediately on connect
      await sendEvent()

      // Then every 3 seconds
      const interval = setInterval(sendEvent, 3000)

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
