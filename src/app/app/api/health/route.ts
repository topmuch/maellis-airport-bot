import { NextResponse } from 'next/server'

// GET /api/health — Health check endpoint for Docker, load balancers, and monitoring
export const dynamic = 'force-dynamic'

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'maellis-airport-bot',
    version: '1.0.0',
  }

  return NextResponse.json(health, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
