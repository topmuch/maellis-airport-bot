import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

// GET /api/auth/me — Get current authenticated user info from token
export async function GET(request: NextRequest) {
  const result = await requireAuth(request)

  if (!result.success || !result.user) {
    return NextResponse.json(
      { error: result.error || 'Not authenticated' },
      { status: result.status || 401 }
    )
  }

  return NextResponse.json({
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
    role: result.user.role,
    airportCode: result.user.airportCode,
  })
}
