import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyRefreshToken, generateToken, type AuthUser } from '@/lib/auth'

// POST /api/auth/refresh — Refresh access token using refresh token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refreshToken: incomingRefreshToken } = body

    if (!incomingRefreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      )
    }

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
      role: admin.role as AuthUser['role'],
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
