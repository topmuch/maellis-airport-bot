import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import pdfParse from 'pdf-parse'

// ─────────────────────────────────────────────
// Text chunking utility
// ─────────────────────────────────────────────
function splitIntoChunks(
  text: string,
  chunkSize = 500,
  overlap = 100
): { content: string; index: number }[] {
  // Clean text first
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return []

  const chunks: { content: string; index: number }[] = []
  let start = 0

  while (start < cleaned.length) {
    let end = start + chunkSize
    // Try to break at sentence boundary
    if (end < cleaned.length) {
      const lastPeriod = cleaned.lastIndexOf('.', end)
      const lastNewline = cleaned.lastIndexOf('\n', end)
      const breakPoint = Math.max(lastPeriod, lastNewline)
      if (breakPoint > start + chunkSize * 0.3) {
        end = breakPoint + 1
      }
    }

    chunks.push({ content: cleaned.slice(start, end).trim(), index: chunks.length })
    start = end - overlap
  }

  return chunks
}

// ─────────────────────────────────────────────
// Text extraction by file type
// ─────────────────────────────────────────────
async function extractTextFromFile(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  switch (fileType) {
    case 'pdf': {
      const data = await pdfParse(buffer)
      return data.text || ''
    }
    case 'txt':
    case 'md':
      return buffer.toString('utf-8')
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['pdf', 'txt', 'md']
const UPLOAD_DIR = join(process.cwd(), 'upload', 'kb')

// POST /api/knowledge-base/upload — Upload file, extract text, chunk and store
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const title = (formData.get('title') as string) || ''
    const airportCode = (formData.get('airportCode') as string) || 'DSS'

    // ── Validate file ──
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Extract file extension
    const originalName = file.name
    const ext = originalName.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_TYPES.includes(ext)) {
      return NextResponse.json(
        { success: false, error: `Unsupported file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // ── Create KB entry (pending status) ──
    const documentTitle = title || originalName.replace(/\.[^/.]+$/, '')

    const document = await db.knowledgeBase.create({
      data: {
        airportCode,
        title: documentTitle,
        fileName: originalName,
        fileType: ext,
        fileSize: file.size,
        status: 'processing',
        uploadedBy: 'admin',
      },
    })

    try {
      // ── Read file buffer ──
      const buffer = Buffer.from(await file.arrayBuffer())

      // ── Save file to disk ──
      await mkdir(UPLOAD_DIR, { recursive: true })
      const savedFileName = `${document.id}_${originalName}`
      const filePath = join(UPLOAD_DIR, savedFileName)
      await writeFile(filePath, buffer)

      // Update fileUrl
      await db.knowledgeBase.update({
        where: { id: document.id },
        data: { fileUrl: filePath },
      })

      // ── Extract text ──
      const extractedText = await extractTextFromFile(buffer, ext)

      if (!extractedText || extractedText.trim().length < 10) {
        await db.knowledgeBase.update({
          where: { id: document.id },
          data: {
            status: 'error',
            errorMessage: 'Could not extract meaningful text from the file',
          },
        })
        return NextResponse.json({
          success: true,
          data: {
            ...document,
            status: 'error',
            errorMessage: 'Could not extract meaningful text from the file',
            chunkCount: 0,
          },
        })
      }

      // ── Split into chunks ──
      const chunks = splitIntoChunks(extractedText)

      if (chunks.length === 0) {
        await db.knowledgeBase.update({
          where: { id: document.id },
          data: {
            status: 'error',
            errorMessage: 'Text too short to generate chunks',
          },
        })
        return NextResponse.json({
          success: true,
          data: {
            ...document,
            status: 'error',
            errorMessage: 'Text too short to generate chunks',
            chunkCount: 0,
          },
        })
      }

      // ── Store chunks in DB ──
      await db.documentChunk.createMany({
        data: chunks.map((chunk) => ({
          kbId: document.id,
          content: chunk.content,
          chunkIndex: chunk.index,
          tokenCount: chunk.content.split(/\s+/).filter(Boolean).length,
        })),
      })

      // ── Mark as indexed ──
      const updatedDoc = await db.knowledgeBase.update({
        where: { id: document.id },
        data: {
          status: 'indexed',
          chunkCount: chunks.length,
          processedAt: new Date(),
          content: extractedText.slice(0, 5000), // Store preview (SQLite-friendly)
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          ...updatedDoc,
          chunkCount: chunks.length,
        },
      })
    } catch (processingError) {
      // Mark document as error on processing failure
      const errorMessage =
        processingError instanceof Error
          ? processingError.message
          : 'Unknown processing error'

      await db.knowledgeBase.update({
        where: { id: document.id },
        data: { status: 'error', errorMessage },
      })

      return NextResponse.json({
        success: true,
        data: {
          ...document,
          status: 'error',
          errorMessage,
          chunkCount: 0,
        },
      })
    }
  } catch (error) {
    console.error('KnowledgeBase UPLOAD error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload and process document' },
      { status: 500 }
    )
  }
}
