import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

// ─────────────────────────────────────────────
// Input validation schemas
// ─────────────────────────────────────────────

const PAYMENT_STATUSES = [
  'pending',
  'paid',
  'failed',
  'refunded',
  'cancelled',
] as const

const PAYMENT_PROVIDERS = [
  'cinetpay',
  'orange_money',
  'wave',
  'bank_transfer',
  'cash',
] as const

const paymentsQuerySchema = z.object({
  status: z.enum(PAYMENT_STATUSES).optional(),
  provider: z.enum(PAYMENT_PROVIDERS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// GET /api/payments - List payments with optional filtering
export async function GET(request: NextRequest) {
  const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT')
  const authResult = await checkRole(request)
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 })
  }

  try {
    // Parse and validate all query parameters
    const rawParams: Record<string, string> = {}
    request.nextUrl.searchParams.forEach((value, key) => {
      rawParams[key] = value
    })

    const parsed = paymentsQuerySchema.safeParse(rawParams)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { status, provider, page, limit } = parsed.data
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (provider) where.provider = provider

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.payment.count({ where }),
    ])

    const totalAmount = await db.payment.aggregate({
      where: { status: 'completed' },
      _sum: { amount: true },
    })

    return NextResponse.json({
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalCompleted: totalAmount._sum.amount ?? 0,
      },
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
