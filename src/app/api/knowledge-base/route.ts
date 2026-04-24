import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'
import { parseBody, ValidationError } from '@/lib/validate'

// GET /api/knowledge-base — List all KnowledgeBase documents for an airport
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const { searchParams } = new URL(req.url)
    const airportCode = searchParams.get('airportCode') || 'DSS'
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = { airportCode }
    if (status) {
      where.status = status
    }
    if (search) {
      where.title = { contains: search }
    }

    const [documents, total] = await Promise.all([
      db.knowledgeBase.findMany({
        where,
        select: {
          id: true,
          airportCode: true,
          title: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          chunkCount: true,
          isActive: true,
          status: true,
          errorMessage: true,
          processedAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.knowledgeBase.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        documents,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('KnowledgeBase GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch knowledge base documents' },
      { status: 500 }
    )
  }
}

// POST /api/knowledge-base — Create a new KnowledgeBase entry (metadata only)
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(req)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const body = await parseBody(req)
    const { title, airportCode = 'DSS', fileType } = body

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      )
    }

    const document = await db.knowledgeBase.create({
      data: {
        airportCode,
        title,
        fileName: '',
        fileType: fileType || 'txt',
        fileSize: 0,
        status: 'pending',
        uploadedBy: 'admin',
      },
    })

    return NextResponse.json({ success: true, data: document }, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('KnowledgeBase POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create knowledge base document' },
      { status: 500 }
    )
  }
}
