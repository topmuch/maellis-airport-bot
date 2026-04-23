import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'

// GET /api/audit-logs — Query audit logs with pagination and filters
export async function GET(request: NextRequest) {
  try {
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
      where.createdAt = {}
      if (from) {
        ;(where.createdAt as Record<string, unknown>).gte = new Date(from)
      }
      if (to) {
        ;(where.createdAt as Record<string, unknown>).lte = new Date(to)
      }
    }

    // Count total matching records
    const total = await db.activityLog.count({ where })

    // Fetch paginated results
    const data = await db.activityLog.findMany({
      where,
      include: {
        admin: {
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
      { error: 'Erreur lors de la récupération des journaux d\'audit' },
      { status: 500 }
    )
  }
}

// POST /api/audit-logs — Manual audit entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { adminId, action, module, details } = body

    if (!action || !module) {
      return NextResponse.json(
        { error: 'Les champs action et module sont obligatoires' },
        { status: 400 }
      )
    }

    const validActions = ['create', 'update', 'delete', 'login', 'logout', 'export', 'view', 'configure']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Action invalide. Valeurs acceptées: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    const validModules = ['emergency', 'conversations', 'team', 'reports', 'settings', 'flights', 'payments', 'auth']
    if (!validModules.includes(module)) {
      return NextResponse.json(
        { error: `Module invalide. Valeurs acceptées: ${validModules.join(', ')}` },
        { status: 400 }
      )
    }

    await logAudit({
      adminId: adminId || undefined,
      action: action as 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'view' | 'configure',
      module,
      details,
    })

    return NextResponse.json(
      { message: 'Entrée d\'audit créée avec succès' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating audit log:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'entrée d\'audit' },
      { status: 500 }
    )
  }
}
