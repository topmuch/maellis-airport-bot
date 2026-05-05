import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { metaRequest } from '@/lib/external-api-client'

// ── POST /api/external/meta/[...path] ──────────────────────────────────────
// Proxy sécurisé : injecte Bearer token depuis la DB.
// Ex: POST /api/external/meta/v18.0/{phoneId}/messages
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
  }

  const { path } = await params
  const endpoint = '/' + path.join('/')

  let body: Record<string, unknown> | undefined
  try {
    body = await request.json()
  } catch {
    body = undefined
  }

  const result = await metaRequest(endpoint, body, 'POST')
  return NextResponse.json(result.data, { status: result.status })
}

// ── GET /api/external/meta/[...path] ──────────────────────────────────────
// Pour les endpoints en lecture (ex: vérification de numéro)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
  }

  const { path } = await params
  const endpoint = '/' + path.join('/')

  const result = await metaRequest(endpoint, undefined, 'GET')
  return NextResponse.json(result.data, { status: result.status })
}

// ── DELETE /api/external/meta/[...path] ────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
  }

  const { path } = await params
  const endpoint = '/' + path.join('/')

  const result = await metaRequest(endpoint, undefined, 'DELETE')
  return NextResponse.json(result.data, { status: result.status })
}
