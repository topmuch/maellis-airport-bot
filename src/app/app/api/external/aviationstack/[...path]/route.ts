import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { aviationStackRequest } from '@/lib/external-api-client'

// ── GET /api/external/aviationstack/[...path] ──────────────────────────────
// Proxy sécurisé : injecte la clé depuis la DB, jamais côté client.
// Ex: GET /api/external/aviationstack/flights?flight_icao=AF123
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT', 'VIEWER')(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
  }

  const { path } = await params
  const endpoint = '/' + path.join('/')
  const searchParams = Object.fromEntries(request.nextUrl.searchParams)

  const result = await aviationStackRequest(endpoint, searchParams)
  return NextResponse.json(result.data, { status: result.status })
}
