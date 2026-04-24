import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getPagination } from '@/lib/validate'

// ─────────────────────────────────────────────
// Input validation schemas
// ─────────────────────────────────────────────

const createBaggageQRSchema = z.object({
  phone: z.string().min(1).max(30),
  passengerName: z.string().min(1).max(200),
  flightNumber: z.string().min(1).max(20),
  pnr: z.string().min(1).max(20),
  tagNumber: z.string().min(1).max(50),
  weight: z.number().min(0).max(500).nullable().optional(),
  destination: z.string().min(1).max(100),
  qrToken: z.string().min(1).max(500),
  status: z.enum(['active', 'inactive', 'claimed', 'lost', 'delivered']).optional().default('active'),
  expiresAt: z.string().datetime({ offset: true }).optional(),
})

// GET /api/baggage - List baggage QR codes
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user.success) {
      return NextResponse.json({ error: user.error }, { status: user.status })
    }

    const { searchParams } = new URL(request.url)
    const { page, limit, skip } = getPagination(searchParams)

    const baggageList = await db.baggageQR.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })

    return NextResponse.json({ data: baggageList, page, limit })
  } catch (error) {
    console.error('Error fetching baggage QR codes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch baggage QR codes' },
      { status: 500 }
    )
  }
}

// POST /api/baggage - Create new baggage QR code
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
    const parsed = createBaggageQRSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data

    const baggageQR = await db.baggageQR.create({
      data: {
        phone: data.phone,
        passengerName: data.passengerName,
        flightNumber: data.flightNumber,
        pnr: data.pnr,
        tagNumber: data.tagNumber,
        weight: data.weight ?? null,
        destination: data.destination,
        qrToken: data.qrToken,
        status: data.status,
        expiresAt: data.expiresAt
          ? new Date(data.expiresAt)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    return NextResponse.json(baggageQR, { status: 201 })
  } catch (error) {
    console.error('Error creating baggage QR code:', error)
    return NextResponse.json(
      { error: 'Failed to create baggage QR code' },
      { status: 500 }
    )
  }
}
