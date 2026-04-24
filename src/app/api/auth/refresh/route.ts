import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { verifyRefreshToken, generateToken, normalizeRole, type AuthUser } from '@/lib/auth'

// ─── Input Validation ───────────────────────────────────────────────
const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

// POST /api/auth/refresh — Refresh access token using refresh token
export async function POST(request: NextRequest) {
  try {
    // Guard: JWT_SECRET must be configured
    if (!process.env.JWT_SECRET) {
      console.error('[AUTH] Token refresh attempt failed: JWT_SECRET is not configured')
      return NextResponse.json(
        { error: 'Authentication service is not configured. Contact your administrator.' },
        { status: 503 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON.' },
        { status: 400 }
      )
    }

    const parsed = refreshSchema.safeParse(body)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return NextResponse.json(
        { error: firstIssue?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const { refreshToken: incomingRefreshToken } = parsed.data

    // Verify the refresh token
    const verification = verifyRefreshToken(incomingRefreshToken)

    if (!verification.success || !verification.user) {
      return NextResponse.json(
        { error: verification.error || 'Invalid refresh token' },
        { status: 401 }
      )
    }

    // Look up admin and verify the stored refresh token matches
    const admin = await db.admin.findUnique({
      where: { id: verification.user.id },
    })

    if (!admin) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    if (!admin.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      )
    }

    // Verify the refresh token matches what's stored in DB
    if (admin.refreshToken !== incomingRefreshToken) {
      // Token reuse detected — invalidate all tokens for security
      await db.admin.update({
        where: { id: admin.id },
        data: { refreshToken: null },
      })

      return NextResponse.json(
        { error: 'Refresh token has been revoked. Please log in again.' },
        { status: 401 }
      )
    }

    // Build AuthUser and generate new access token
    const authUser: AuthUser = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: normalizeRole(admin.role),
      airportCode: admin.airportCode ?? undefined,
    }

    const newToken = generateToken(authUser)

    return NextResponse.json({
      token: newToken,
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: 'Internal server error during token refresh' },
      { status: 500 }
    )
  }
}
