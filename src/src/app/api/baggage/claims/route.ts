import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { fileClaim, getClaims } from '@/lib/services/baggage-claims.service'

// ─────────────────────────────────────────────
// Input validation schemas
// ─────────────────────────────────────────────

const VALID_CLAIM_STATUSES = [
  'pending',
  'in_progress',
  'resolved',
  'closed',
  'rejected',
] as const

const claimsQuerySchema = z.object({
  status: z.string().max(50).optional(),
  phone: z.string().max(30).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const fileClaimSchema = z.object({
  phone: z.string().min(1).max(30),
  passengerName: z.string().min(1).max(200),
  flightNumber: z.string().max(20).optional(),
  description: z.string().min(1).max(2000),
  location: z.string().max(200).optional(),
  baggageId: z.string().max(100).optional(),
})

// POST /api/baggage/claims — File a new baggage claim
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user.success) {
      return NextResponse.json({ error: user.error }, { status: user.status })
    }

    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const parsed = fileClaimSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const claim = await fileClaim({
      phone: parsed.data.phone,
      passengerName: parsed.data.passengerName,
      flightNumber: parsed.data.flightNumber,
      description: parsed.data.description,
      location: parsed.data.location,
      baggageId: parsed.data.baggageId,
    })

    return NextResponse.json(claim, { status: 201 })
  } catch (error) {
    console.error('Error filing baggage claim:', error)
    return NextResponse.json(
      { error: 'Failed to file baggage claim' },
      { status: 500 }
    )
  }
}

// GET /api/baggage/claims — List claims with pagination & filters
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user.success) {
      return NextResponse.json({ error: user.error }, { status: user.status })
    }

    // Validate and sanitize query parameters
    const rawParams: Record<string, string> = {}
    request.nextUrl.searchParams.forEach((value, key) => {
      rawParams[key] = value
    })
    const parsed = claimsQuerySchema.safeParse(rawParams)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { status, phone, page, limit } = parsed.data

    // Sanitize status filter: only allow known values
    const sanitizedStatus = status
      ? (VALID_CLAIM_STATUSES as readonly string[]).includes(status)
        ? status
        : undefined
      : undefined

    const result = await getClaims({
      status: sanitizedStatus,
      phone,
      page,
      limit,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching baggage claims:', error)
    return NextResponse.json(
      { error: 'Failed to fetch baggage claims' },
      { status: 500 }
    )
  }
}
