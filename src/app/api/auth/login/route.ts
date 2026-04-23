import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  verifyPassword,
  generateToken,
  generateRefreshToken,
  type AuthUser,
} from '@/lib/auth'

// POST /api/auth/login — Authenticate admin and return tokens
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Look up admin by email
    const admin = await db.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if admin is active
    if (!admin.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated. Contact your administrator.' },
        { status: 403 }
      )
    }

    // Check if password hash exists (legacy admin without password)
    if (!admin.passwordHash) {
      return NextResponse.json(
        { error: 'Account has no password set. Please reset your password.' },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = verifyPassword(password, admin.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Build AuthUser object from admin record
    const authUser: AuthUser = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role as AuthUser['role'],
      airportCode: admin.airportCode ?? undefined,
    }

    // Generate tokens
    const token = generateToken(authUser)
    const refreshToken = generateRefreshToken(admin.id)

    // Store refresh token in DB
    await db.admin.update({
      where: { id: admin.id },
      data: {
        refreshToken,
        lastLogin: new Date(),
      },
    })

    // Create activity log entry
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    await db.activityLog.create({
      data: {
        adminId: admin.id,
        action: 'login',
        module: 'auth',
        details: `Admin ${admin.name} logged in successfully`,
        ipAddress,
      },
    })

    return NextResponse.json({
      token,
      refreshToken,
      user: {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        role: authUser.role,
        airportCode: authUser.airportCode,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error during login' },
      { status: 500 }
    )
  }
}
