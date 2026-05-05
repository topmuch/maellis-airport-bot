import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { z } from 'zod'

// ── POST /api/admin/kb-import/import ──────────────────────────────────────
// Sauvegarde le contenu validé dans la Base de Connaissances.
// Découpe en chunks de ~500 caractères pour l'indexation RAG.
const importSchema = z.object({
  url: z.string().url().max(2000),
  content: z.string().min(50).max(100_000),
  title: z.string().max(500).optional(),
  airportCode: z.string().max(10).default('DSS'),
})

export async function POST(request: NextRequest) {
  const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN')
  const authResult = await checkRole(request)
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Accès refusé' }, { status: authResult.status || 401 })
  }

  try {
    const body = await request.json()
    const parsed = importSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Données invalides',
        details: parsed.error.issues,
      }, { status: 400 })
    }

    const { url, content, title, airportCode } = parsed.data

    // Split content into chunks of ~500 characters at sentence/word boundaries
    const chunks = splitIntoChunks(content, 500)

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'Contenu trop court pour être découpé en chunks' }, { status: 400 })
    }

    // Create the main KB entry with full content
    const kbEntry = await db.knowledgeBase.create({
      data: {
        id: crypto.randomUUID(),
        airportCode,
        title: title || `Import externe — ${new Date().toLocaleDateString('fr-FR')}`,
        fileName: new URL(url).hostname,
        fileType: 'url',
        fileSize: content.length,
        content,
        chunkCount: chunks.length,
        isActive: true,
        status: 'indexed',
        uploadedBy: authResult.user.email || authResult.user.id || 'admin',
        processedAt: new Date(),
        updatedAt: new Date(),
        sourceUrl: url,
        importedAt: new Date(),
        isExternal: true,
      },
    })

    // Create DocumentChunks for RAG
    const chunkCreates = chunks.map((chunk, index) => ({
      id: crypto.randomUUID(),
      kbId: kbEntry.id,
      content: chunk,
      chunkIndex: index,
      tokenCount: Math.ceil(chunk.length / 4), // rough estimate
    }))

    if (chunkCreates.length > 0) {
      await db.documentChunk.createMany({ data: chunkCreates })
    }

    console.info(`[kb-import/import] Imported ${chunks.length} chunks from ${url}`)

    return NextResponse.json({
      success: true,
      message: `${chunks.length} bloc(s) ajoutés à la Base de Connaissances`,
      documentId: kbEntry.id,
      chunkCount: chunks.length,
      title: kbEntry.title,
    })
  } catch (error) {
    console.error('[kb-import/import] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Échec de l\'import' },
      { status: 500 },
    )
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Split text into chunks of approximately `maxLength` characters,
 * breaking at word/sentence boundaries when possible.
 */
function splitIntoChunks(text: string, maxLength: number): string[] {
  const chunks: string[] = []
  let remaining = text.trim()

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining.trim())
      break
    }

    // Try to break at a sentence boundary
    let breakIndex = remaining.lastIndexOf('.', maxLength)
    if (breakIndex < maxLength * 0.3) {
      // Fall back to word boundary
      breakIndex = remaining.lastIndexOf(' ', maxLength)
    }
    if (breakIndex < maxLength * 0.3) {
      // Last resort: hard break
      breakIndex = maxLength
    }

    chunks.push(remaining.slice(0, breakIndex + 1).trim())
    remaining = remaining.slice(breakIndex + 1).trim()
  }

  return chunks.filter(chunk => chunk.length > 10) // Skip tiny fragments
}
