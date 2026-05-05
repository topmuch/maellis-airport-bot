import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { unlink } from 'fs/promises'
import path from 'path'
import { requireRole } from '@/lib/auth'
import { validateId, parseBody, ValidationError } from '@/lib/validate'

// GET /api/knowledge-base/[id] — Get single document with its chunks
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    try {
      validateId(id)
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode })
      }
      throw err
    }

    const document = await db.knowledgeBase.findUnique({
      where: { id },
      include: {
        DocumentChunk: {
          select: {
            id: true,
            content: true,
            chunkIndex: true,
            tokenCount: true,
            embeddingModel: true,
          },
          orderBy: { chunkIndex: 'asc' },
        },
      },
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: document })
  } catch (error) {
    console.error('KnowledgeBase GET by ID error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch document' },
      { status: 500 }
    )
  }
}

// PUT /api/knowledge-base/[id] — Update document metadata
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(req)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const { id } = await params
    try {
      validateId(id)
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode })
      }
      throw err
    }
    const body = await parseBody(req)
    const { title, isActive } = body

    // Check document exists
    const existing = await db.knowledgeBase.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (isActive !== undefined) updateData.isActive = isActive

    const document = await db.knowledgeBase.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: document })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('KnowledgeBase PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update document' },
      { status: 500 }
    )
  }
}

// DELETE /api/knowledge-base/[id] — Delete document and cascade chunks
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(req)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const { id } = await params
    try {
      validateId(id)
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode })
      }
      throw err
    }

    // Check document exists
    const document = await db.knowledgeBase.findUnique({ where: { id } })
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    // Delete file from disk if it exists
    // fileUrl is stored as "upload://kb/filename" — build real filesystem path
    if (document.fileUrl || document.fileName) {
      try {
        const fileBasename = path.basename(document.fileUrl || document.fileName || '')
        if (fileBasename) {
          const realPath = path.join(process.cwd(), 'upload', 'kb', fileBasename)
          await unlink(realPath)
        }
      } catch {
        // File might not exist on disk, continue with DB deletion
      }
    }

    // Delete document (cascade will delete chunks)
    await db.knowledgeBase.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: 'Document and all associated chunks deleted',
    })
  } catch (error) {
    console.error('KnowledgeBase DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
