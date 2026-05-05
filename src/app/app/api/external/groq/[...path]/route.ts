import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { groqRequest } from '@/lib/external-api-client'

// ── POST /api/external/groq/[...path] ──────────────────────────────────────
// Proxy sécurisé : injecte Bearer token depuis la DB.
// Ex: POST /api/external/groq/chat/completions { model, messages, ... }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT')(request)
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

  const result = await groqRequest(endpoint, body)
  return NextResponse.json(result.data, { status: result.status })
}

// ── GET /api/external/groq/[...path] ──────────────────────────────────────
// Pour les endpoints en lecture (ex: /models)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT')(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
  }

  const { path } = await params
  const endpoint = '/' + path.join('/')

  const result = await groqRequest(endpoint)
  return NextResponse.json(result.data, { status: result.status })
}
