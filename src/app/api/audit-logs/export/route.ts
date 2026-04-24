import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'

// ---------------------------------------------------------------------------
// GET /api/audit-logs/export — Export audit logs as CSV or JSON (admin-only)
// ---------------------------------------------------------------------------

const EXPORT_MAX_ROWS = 10_000
const EXPORT_MAX_DATE_RANGE_DAYS = 90

const requireAdmin = requireRole('SUPERADMIN', 'AIRPORT_ADMIN')

const exportQuerySchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  from: z.string().optional(),
  to: z.string().optional(),
  module: z.string().max(50).optional(),
})

export async function GET(request: NextRequest) {
  try {
    // ── Auth & role check (admin-only) ──
    const user = await requireAdmin(request)
    if (!user.success) {
      return NextResponse.json(
        { success: false, error: user.error },
        { status: user.status },
      )
    }

    // ── Validate query parameters with Zod ──
    const query: Record<string, string> = {}
    request.nextUrl.searchParams.forEach((v, k) => { query[k] = v })
    const parsed = exportQuerySchema.safeParse(query)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    const { format, from, to, module: moduleFilter } = parsed.data

    // ── Date range validation (DoS prevention) ──
    const fromDate = from ? new Date(from) : undefined
    const toDate = to ? new Date(to) : undefined

    if (fromDate && isNaN(fromDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid "from" date format' },
        { status: 400 },
      )
    }
    if (toDate && isNaN(toDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid "to" date format' },
        { status: 400 },
      )
    }

    // Enforce max date range to prevent unbounded exports
    if (fromDate && toDate) {
      const rangeMs = toDate.getTime() - fromDate.getTime()
      if (rangeMs > EXPORT_MAX_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000) {
        return NextResponse.json(
          { success: false, error: `Date range must not exceed ${EXPORT_MAX_DATE_RANGE_DAYS} days` },
          { status: 400 },
        )
      }
      if (rangeMs < 0) {
        return NextResponse.json(
          { success: false, error: '"from" date must be before "to" date' },
          { status: 400 },
        )
      }
    }

    // If no date range is specified, default to last 30 days to cap data volume
    const effectiveFrom = fromDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const effectiveTo = toDate ?? new Date()

    // Build where clause
    const where: Record<string, unknown> = {
      createdAt: {
        gte: effectiveFrom,
        lte: effectiveTo,
      },
    }

    if (moduleFilter) {
      where.module = moduleFilter
    }

    // Fetch matching records with hard safety limit
    const logs = await db.activityLog.findMany({
      where,
      include: {
        admin: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: EXPORT_MAX_ROWS,
    })

    if (logs.length === EXPORT_MAX_ROWS) {
      // Log a warning so admins know results were truncated
      console.warn(
        `[AUDIT EXPORT] Results truncated at ${EXPORT_MAX_ROWS}. Consider narrowing the date range.`,
      )
    }

    // ── Audit the export action ──
    await logAudit({
      adminId: user.user?.id,
      action: 'export',
      module: 'auth',
      details: `Exported ${logs.length} audit logs (${format}) | from=${effectiveFrom.toISOString()} | to=${effectiveTo.toISOString()}`,
    })

    const filenameDate = new Date().toISOString().slice(0, 10)

    if (format === 'json') {
      const jsonData = logs.map((log) => ({
        date: log.createdAt.toISOString(),
        admin: log.admin ? `${log.admin.name} (${log.admin.email})` : 'System',
        action: log.action,
        module: log.module,
        details: log.details || '',
        ip: log.ipAddress || '',
      }))

      return new NextResponse(JSON.stringify(jsonData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="audit-logs-${filenameDate}.json"`,
        },
      })
    }

    // CSV export (default)
    const BOM = '\uFEFF'
    const csvHeader = 'Date,Admin,Action,Module,Details,IP\n'
    const csvRows = logs.map((log) => {
      const date = log.createdAt.toISOString()
      const admin = log.admin ? `${log.admin.name} (${log.admin.email})` : 'System'
      const action = log.action
      const logModule = log.module
      const details = (log.details || '').replace(/"/g, '""')
      const ip = log.ipAddress || ''

      return `"${date}","${admin}","${action}","${logModule}","${details}","${ip}"`
    })

    const csvContent = BOM + csvHeader + csvRows.join('\n')

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-logs-${filenameDate}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting audit logs:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
