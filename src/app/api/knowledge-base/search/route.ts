import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ─────────────────────────────────────────────
// TF-IDF Search Utilities
// ─────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

function tfidfSearch(
  query: string,
  chunks: { content: string; metadata: Record<string, unknown> }[],
  topK = 5
) {
  const queryTokens = tokenize(query)
  if (!queryTokens.length) return []

  // Build IDF
  const docCount = chunks.length
  const df: Record<string, number> = {}
  for (const chunk of chunks) {
    const tokens = new Set(tokenize(chunk.content))
    for (const t of tokens) df[t] = (df[t] || 0) + 1
  }

  // Score each chunk
  const scored = chunks.map((chunk) => {
    const chunkTokens = tokenize(chunk.content)
    const tf: Record<string, number> = {}
    for (const t of chunkTokens) tf[t] = (tf[t] || 0) + 1

    let score = 0
    for (const qt of queryTokens) {
      if (tf[qt]) {
        const idf =
          Math.log((docCount + 1) / ((df[qt] || 0) + 1)) + 1
        score += (tf[qt] / chunkTokens.length) * idf
      }
    }
    return { chunk, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

// POST /api/knowledge-base/search — Search the knowledge base (used by bot)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, airportCode = 'DSS', topK = 5, minScore = 0 } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      )
    }

    // Fetch all active chunks for the airport (only indexed documents)
    const documents = await db.knowledgeBase.findMany({
      where: {
        airportCode,
        isActive: true,
        status: 'indexed',
      },
      select: {
        id: true,
        title: true,
        fileName: true,
        fileType: true,
      },
    })

    if (documents.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          results: [],
          context: '',
          totalChunks: 0,
          query,
        },
      })
    }

    const documentIds = documents.map((d) => d.id)

    // Build a lookup map for document titles
    const docMap = new Map(documents.map((d) => [d.id, d]))

    // Fetch all chunks for these documents
    const chunks = await db.documentChunk.findMany({
      where: {
        kbId: { in: documentIds },
      },
      select: {
        id: true,
        kbId: true,
        content: true,
        chunkIndex: true,
        tokenCount: true,
      },
      orderBy: { chunkIndex: 'asc' },
    })

    if (chunks.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          results: [],
          context: '',
          totalChunks: 0,
          query,
        },
      })
    }

    // Run TF-IDF search
    const searchResults = tfidfSearch(
      query,
      chunks.map((c) => ({
        content: c.content,
        metadata: { kbId: c.kbId, chunkIndex: c.chunkIndex },
      })),
      topK
    )

    // Filter by minimum score
    const filtered = searchResults.filter((r) => r.score >= minScore)

    // Build response
    const results = filtered.map((r) => {
      const doc = docMap.get(r.chunk.metadata.kbId as string)
      return {
        chunkId: chunks.find(
          (c) =>
            c.kbId === (r.chunk.metadata.kbId as string) &&
            c.chunkIndex === (r.chunk.metadata.chunkIndex as number)
        )?.id,
        content: r.chunk.content,
        score: Math.round(r.score * 1000) / 1000,
        source: doc
          ? {
              documentId: doc.id,
              title: doc.title,
              fileName: doc.fileName,
              fileType: doc.fileType,
            }
          : null,
        chunkIndex: r.chunk.metadata.chunkIndex,
      }
    })

    // Build context string for LLM prompt
    const context = results
      .map(
        (r, i) =>
          `[${i + 1}] (Source: ${r.source?.title || 'Unknown'}, Score: ${r.score})\n${r.content}`
      )
      .join('\n\n---\n\n')

    return NextResponse.json({
      success: true,
      data: {
        results,
        context,
        totalChunks: chunks.length,
        query,
      },
    })
  } catch (error) {
    console.error('KnowledgeBase SEARCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to search knowledge base' },
      { status: 500 }
    )
  }
}
