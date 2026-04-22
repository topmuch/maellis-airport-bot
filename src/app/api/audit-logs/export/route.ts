import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/audit-logs/export — Export audit logs as CSV or JSON
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const format = searchParams.get('format') || 'csv'
    const from = searchParams.get('from') || undefined
    const to = searchParams.get('to') || undefined
    const moduleFilter = searchParams.get('module') || undefined

    // Build where clause
    const where: Record<string, unknown> = {}

    if (moduleFilter) {
      where.module = moduleFilter
    }
    if (from || to) {
      where.createdAt = {}
      if (from) {
        ;(where.createdAt as Record<string, unknown>).gte = new Date(from)
      }
      if (to) {
        ;(where.createdAt as Record<string, unknown>).lte = new Date(to)
      }
    }

    // Fetch all matching records (no pagination for export)
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
      take: 10000, // Safety limit
    })

    if (format === 'json') {
      // JSON export
      const jsonData = logs.map((log) => ({
        date: log.createdAt.toISOString(),
        admin: log.admin ? `${log.admin.name} (${log.admin.email})` : 'Système',
        action: log.action,
        module: log.module,
        details: log.details || '',
        ip: log.ipAddress || '',
      }))

      return new NextResponse(JSON.stringify(jsonData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      })
    }

    // CSV export (default)
    const BOM = '\uFEFF'
    const csvHeader = 'Date,Admin,Action,Module,Détails,IP\n'
    const csvRows = logs.map((log) => {
      const date = log.createdAt.toISOString()
      const admin = log.admin ? `${log.admin.name} (${log.admin.email})` : 'Système'
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
        'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting audit logs:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'export des journaux d\'audit' },
      { status: 500 }
    )
  }
}
