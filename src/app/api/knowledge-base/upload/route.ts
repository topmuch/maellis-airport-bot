import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// ── POST /api/knowledge-base/upload ─────────────────────────────────────
// Upload a PDF/TXT/MD file and create a KnowledgeBase entry.
export async function POST(request: NextRequest) {
  const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN')
  const authResult = await checkRole(request)
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Accès refusé' }, { status: authResult.status || 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = (formData.get('title') as string)?.trim()

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'text/md',
    ]
    const allowedExtensions = ['.pdf', '.txt', '.md']
    const ext = path.extname(file.name).toLowerCase()

    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: `Type de fichier non supporté. Formats acceptés : ${allowedExtensions.join(', ')}` },
        { status: 400 },
      )
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 400 })
    }

    // Read file content
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Extract text content for PDF (simple text extraction for TXT/MD)
    let content = ''
    if (ext === '.txt' || ext === '.md') {
      content = new TextDecoder('utf-8').decode(buffer)
    } else if (ext === '.pdf') {
      // For PDF, store raw bytes and extract text later via RAG pipeline
      // Simple approach: store a placeholder indicating PDF needs processing
      content = `[PDF Document: ${file.name}] — Contenu à extraire via le pipeline RAG.`
    }

    // Save file to upload directory
    const uploadDir = path.join(process.cwd(), 'upload', 'kb')
    await mkdir(uploadDir, { recursive: true })
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    // Create KnowledgeBase entry via dynamic Prisma import
    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()

    const docTitle = title || file.name.replace(/\.[^/.]+$/, '')

    const doc = await db.knowledgeBase.create({
      data: {
        id: crypto.randomUUID(),
        title: docTitle,
        content: content || null,
        fileName: fileName,
        fileType: ext.replace('.', '').toUpperCase(),
        fileSize: file.size,
        fileUrl: `upload://kb/${fileName}`,
        airportCode: 'DSS',
        uploadedBy: authResult.user.email || authResult.user.name || 'unknown',
        chunkCount: content ? Math.ceil(content.length / 500) : 0,
        status: content ? 'completed' : 'pending',
        updatedAt: new Date(),
      },
    })

    await db.$disconnect()

    return NextResponse.json({
      success: true,
      data: doc,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de l'upload"
    console.error('[kb-upload] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
