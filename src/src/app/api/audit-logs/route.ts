import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'

// ---------------------------------------------------------------------------
// Shared: admin role guard
// ---------------------------------------------------------------------------

const requireAdmin = requireRole('SUPERADMIN', 'AIRPORT_ADMIN')

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const validActions = ['create', 'update', 'delete', 'login', 'logout', 'export', 'view', 'configure'] as const
const validModules = ['emergency', 'conversations', 'team', 'reports', 'settings', 'flights', 'payments', 'auth'] as const

const auditPostSchema = z.object({
  adminId: z.string().max(128).optional(),
  action: z.enum(validActions, {
    message: `Invalid action. Allowed: ${validActions.join(', ')}`,
  }),
  module: z.enum(validModules, {
    message: `Invalid module. Allowed: ${validModules.join(', ')}`,
  }),
  details: z.string().max(2000).optional(),
})

// GET /api/audit-logs — Query audit logs with pagination and filters
export async function GET(request: NextRequest) {
  try {
    // ── Auth & role check ──
    const user = await requireAdmin(request)
    if (!user.success) return NextResponse.json({ success: false, error: user.error }, { status: user.status })

    const { searchParams } = request.nextUrl

    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
    const moduleFilter = searchParams.get('module') || undefined
    const actionFilter = searchParams.get('action') || undefined
    const adminIdFilter = searchParams.get('adminId') || undefined
    const from = searchParams.get('from') || undefined
    const to = searchParams.get('to') || undefined

    // Build where clause
    const where: Record<string, unknown> = {}

    if (moduleFilter) {
      where.module = moduleFilter
    }
    if (actionFilter) {
      where.action = actionFilter
    }
    if (adminIdFilter) {
      where.adminId = adminIdFilter
    }
    if (from || to) {
      const fromDate = from ? new Date(from) : undefined
      const toDate = to ? new Date(to) : undefined

      // Validate date range: reject unreasonable spans (> 1 year) to prevent DoS
      if (fromDate && toDate && (toDate.getTime() - fromDate.getTime()) > 365 * 24 * 60 * 60 * 1000) {
        return NextResponse.json(
          { success: false, error: 'Date range must not exceed 1 year' },
          { status: 400 },
        )
      }

      where.createdAt = {}
      if (fromDate && !isNaN(fromDate.getTime())) {
        ;(where.createdAt as Record<string, unknown>).gte = fromDate
      }
      if (toDate && !isNaN(toDate.getTime())) {
        ;(where.createdAt as Record<string, unknown>).lte = toDate
      }
    }

    // Count total matching records
    const total = await db.activityLog.count({ where })

    // Fetch paginated results
    const data = await db.activityLog.findMany({
      where,
      include: {
        Admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// POST /api/audit-logs — Manual audit entry
export async function POST(request: NextRequest) {
  try {
    // ── Auth & role check ──
    const user = await requireAdmin(request)
    if (!user.success) return NextResponse.json({ success: false, error: user.error }, { status: user.status })

    // Parse & validate body with Zod
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Request body must be valid JSON' },
        { status: 400 },
      )
    }

    const parsed = auditPostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    const { adminId, action, module, details } = parsed.data

    await logAudit({
      adminId,
      action,
      module,
      details,
    })

    return NextResponse.json(
      { success: true, message: 'Audit entry created successfully' },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating audit log:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
