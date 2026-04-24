import { db } from '@/lib/db'
import { PDFParse as pdfParse } from 'pdf-parse'

// ═══════════════════════════════════════════════════════════════════════════
// RAG Service — Retrieval-Augmented Generation for Knowledge Base
// Smartly Assistant — WhatsApp AI Airport Chatbot
// ═══════════════════════════════════════════════════════════════════════════

// ─── Types ─────────────────────────────────────────────────────────────

export interface SearchResult {
  chunkId: string
  kbId: string
  content: string
  score: number
  source: { title: string; fileName: string; fileType: string }
  metadata: Record<string, unknown>
}

export interface RAGResult {
  found: boolean
  query: string
  results: SearchResult[]
  context: string // Concatenated top results for LLM context
  sources: { title: string; fileName: string }[]
}

interface ChunkData {
  content: string
  metadata: Record<string, unknown>
}

// ─── French Stop Words ─────────────────────────────────────────────────

const STOP_WORDS = new Set([
  // French
  'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'est', 'en',
  'que', 'qui', 'dans', 'ce', 'il', 'ne', 'sur', 'se', 'pas', 'plus',
  'par', 'je', 'avec', 'tout', 'faire', 'son', 'à', 'au', 'aux', 'ou',
  'mais', 'si', 'leur', 'y', 'nous', 'vous', 'ils', 'elle', 'elles',
  'on', 'ces', 'mes', 'tes', 'ses', 'mon', 'ton', 'sa', 'ma', 'ta',
  'cette', 'pour', 'été', 'etre', 'avoir', 'sont', 'comme', 'aussi',
  'entre', ' quand', 'tout', 'tres', 'peut', 'autre', 'depuis', 'peu',
  // English
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'and', 'but', 'or', 'nor',
  'not', 'so', 'if', 'it', 'its', 'this', 'that', 'these', 'those',
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'you', 'your', 'he',
  'him', 'his', 'she', 'her', 'hers', 'they', 'them', 'their', 'what',
  'which', 'who', 'whom', 'there', 'here', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'only', 'about', 'up', 'than', 'very',
])

// ─── Text Normalization ────────────────────────────────────────────────

/**
 * Normalize text: lowercase, remove diacritics, tokenize on non-alphanumeric.
 * Returns an array of meaningful tokens (no stop words, min length 2).
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
}

/**
 * Clean extracted text from documents — normalize whitespace, remove common
 * PDF artifacts (page numbers, headers/footers, etc.).
 */
function cleanExtractedText(text: string): string {
  return text
    // Replace multiple newlines with double newline (paragraph break)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    // Replace multiple spaces with single space
    .replace(/[^\S\n]+/g, ' ')
    // Remove common standalone page numbers (e.g., "— 42 —" or just "42" on a line)
    .replace(/^[\s\-–—]*\d{1,4}[\s\-–—]*$/gm, '')
    // Remove trailing whitespace on each line
    .replace(/[ \t]+$/gm, '')
    // Collapse leading/trailing whitespace
    .trim()
}

// ─── Document Parser ───────────────────────────────────────────────────

/**
 * Parse a document buffer into plain text.
 * Supports: PDF, TXT, MD.
 */
export async function parseDocument(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  const normalizedType = fileType.toLowerCase().trim()

  switch (normalizedType) {
    case 'pdf': {
      try {
        const result = await (pdfParse as unknown as (buf: Buffer) => Promise<{text: string}>)(buffer)
        return cleanExtractedText(result.text)
      } catch (error) {
        throw new Error(
          `PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    case 'txt':
    case 'text':
    case 'md':
    case 'markdown': {
      const text = buffer.toString('utf-8')
      return cleanExtractedText(text)
    }

    default:
      throw new Error(`Unsupported file type: ${fileType}. Supported: pdf, txt, md`)
  }
}

// ─── Text Chunker ──────────────────────────────────────────────────────

/**
 * Split text into overlapping chunks, respecting sentence/paragraph boundaries.
 * Default: 500 chars per chunk, 100 chars overlap.
 */
export function splitIntoChunks(
  text: string,
  options?: { chunkSize?: number; overlap?: number }
): ChunkData[] {
  const chunkSize = options?.chunkSize ?? 500
  const overlap = options?.overlap ?? 100

  if (!text.trim()) return []

  const chunks: ChunkData[] = []

  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim())

  if (paragraphs.length === 0) return []

  // If the entire text is short enough, return as a single chunk
  if (text.length <= chunkSize) {
    return [
      {
        content: text.trim(),
        metadata: {
          chunkIndex: 0,
          tokenCount: approximateTokenCount(text),
          charCount: text.length,
        },
      },
    ]
  }

  // Flatten paragraphs into sentences, preserving paragraph boundaries
  const sentences: { text: string; isParagraphStart: boolean }[] = []
  for (const para of paragraphs) {
    // Split paragraph into sentences (basic heuristic)
    const paraSentences = para
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim())

    for (let i = 0; i < paraSentences.length; i++) {
      sentences.push({
        text: paraSentences[i].trim(),
        isParagraphStart: i === 0,
      })
    }
  }

  // Sliding window approach: build chunks by adding sentences until chunkSize
  let currentText = ''
  let currentSentenceStart = 0
  let chunkIndex = 0

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].text
    const separator = currentText.length > 0 ? ' ' : ''

    // If adding this sentence would exceed chunkSize and we have content, finalize chunk
    if (
      currentText.length > 0 &&
      currentText.length + separator.length + sentence.length > chunkSize
    ) {
      chunks.push({
        content: currentText.trim(),
        metadata: {
          chunkIndex,
          tokenCount: approximateTokenCount(currentText),
          charCount: currentText.length,
        },
      })

      chunkIndex++

      // Calculate overlap: go back in sentences to find overlap boundary
      let overlapText = ''
      let overlapSentenceIdx = i - 1
      while (overlapSentenceIdx >= currentSentenceStart) {
        const prevSentence = sentences[overlapSentenceIdx].text
        const candidate =
          overlapText.length > 0 ? prevSentence + ' ' + overlapText : prevSentence
        if (candidate.length <= overlap) {
          overlapText = candidate
          overlapSentenceIdx--
        } else {
          break
        }
      }

      currentText = overlapText
      currentSentenceStart = overlapSentenceIdx + 1
    }

    currentText += (currentText.length > 0 ? ' ' : '') + sentence
  }

  // Push the last chunk if there's remaining content
  if (currentText.trim().length > 0) {
    chunks.push({
      content: currentText.trim(),
      metadata: {
        chunkIndex,
        tokenCount: approximateTokenCount(currentText),
        charCount: currentText.length,
      },
    })
  }

  return chunks
}

/**
 * Approximate token count (rough heuristic: ~4 chars per token for multilingual text).
 */
function approximateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

// ─── Cosine Similarity ─────────────────────────────────────────────────

/**
 * Compute cosine similarity between two numeric vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dotProduct / denominator
}

// ─── TF-IDF Search ─────────────────────────────────────────────────────

/**
 * Compute TF (Term Frequency) for a set of tokens within a document.
 * TF(t, d) = count of t in d / total tokens in d
 */
function computeTF(tokens: string[], docTokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  const docLength = docTokens.length
  if (docLength === 0) return tf

  const docFreq = new Map<string, number>()
  for (const token of docTokens) {
    docFreq.set(token, (docFreq.get(token) || 0) + 1)
  }

  for (const term of tokens) {
    if (docFreq.has(term)) {
      tf.set(term, docFreq.get(term)! / docLength)
    }
  }

  return tf
}

/**
 * Compute IDF (Inverse Document Frequency) across all documents.
 * IDF(t) = log(N / (1 + df(t))) where N = total documents, df = docs containing term
 */
function computeIDF(
  queryTokens: string[],
  allDocTokens: string[][]
): Map<string, number> {
  const N = allDocTokens.length
  if (N === 0) return new Map()

  const idf = new Map<string, number>()

  for (const term of queryTokens) {
    let df = 0
    for (const docTokens of allDocTokens) {
      if (docTokens.includes(term)) {
        df++
      }
    }
    // Smooth IDF: log((N + 1) / (df + 1)) + 1 — ensures no zero IDF
    idf.set(term, Math.log((N + 1) / (df + 1)) + 1)
  }

  return idf
}

/**
 * BM25 scoring function — a more robust variant of TF-IDF.
 * Uses k1=1.5, b=0.75 as standard parameters.
 */
function bm25Score(
  queryTokens: string[],
  docTokens: string[],
  avgDocLength: number,
  idf: Map<string, number>
): number {
  const k1 = 1.5
  const b = 0.75
  const docLength = docTokens.length

  if (docLength === 0) return 0

  let score = 0

  // Count term frequencies in this document
  const termFreqs = new Map<string, number>()
  for (const token of docTokens) {
    termFreqs.set(token, (termFreqs.get(token) || 0) + 1)
  }

  for (const term of queryTokens) {
    const tf = termFreqs.get(term) || 0
    const termIDF = idf.get(term) || 0

    // BM25 formula
    const numerator = tf * (k1 + 1)
    const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength))

    score += termIDF * (numerator / denominator)
  }

  return score
}

/**
 * Perform TF-IDF/BM25 search across all indexed chunks for a given airport.
 * This is the primary search method — no external vector DB needed.
 */
export async function tfidfSearch(
  query: string,
  airportCode: string,
  topK: number = 5
): Promise<SearchResult[]> {
  // Handle edge cases
  if (!query.trim()) return []

  // Fetch all active knowledge bases with indexed status for this airport
  const knowledgeBases = await db.knowledgeBase.findMany({
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
      chunks: {
        select: {
          id: true,
          content: true,
          metadata: true,
        },
      },
    },
  })

  if (knowledgeBases.length === 0) return []

  // Flatten all chunks with their source info
  interface FlatChunk {
    chunkId: string
    kbId: string
    content: string
    title: string
    fileName: string
    fileType: string
    metadata: Record<string, unknown>
  }

  const allChunks: FlatChunk[] = []
  for (const kb of knowledgeBases) {
    for (const chunk of kb.chunks) {
      allChunks.push({
        chunkId: chunk.id,
        kbId: kb.id,
        content: chunk.content,
        title: kb.title,
        fileName: kb.fileName,
        fileType: kb.fileType,
        metadata: safeJsonParse(chunk.metadata),
      })
    }
  }

  if (allChunks.length === 0) return []

  // Tokenize query
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return []

  // Tokenize all chunk documents
  const allDocTokens = allChunks.map((chunk) => tokenize(chunk.content))

  // Compute average document length (for BM25)
  const totalDocLength = allDocTokens.reduce((sum, tokens) => sum + tokens.length, 0)
  const avgDocLength = totalDocLength / allDocTokens.length

  // Compute IDF for query terms across all documents
  const idf = computeIDF(queryTokens, allDocTokens)

  // Score each chunk using BM25
  const scored: Array<{ chunk: FlatChunk; score: number }> = []
  for (let i = 0; i < allChunks.length; i++) {
    const score = bm25Score(queryTokens, allDocTokens[i], avgDocLength, idf)
    if (score > 0) {
      scored.push({ chunk: allChunks[i], score })
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  // Return top-K results
  return scored.slice(0, topK).map(({ chunk, score }) => ({
    chunkId: chunk.chunkId,
    kbId: chunk.kbId,
    content: chunk.content,
    score: Math.round(score * 1000) / 1000, // Round to 3 decimals
    source: {
      title: chunk.title,
      fileName: chunk.fileName,
      fileType: chunk.fileType,
    },
    metadata: chunk.metadata,
  }))
}

// ─── RAG Query ─────────────────────────────────────────────────────────

/**
 * Main RAG query: search the knowledge base and return structured results
 * with context ready for LLM consumption.
 */
export async function ragQuery(
  question: string,
  airportCode: string,
  options?: { topK?: number; minScore?: number }
): Promise<RAGResult> {
  const topK = options?.topK ?? 5
  const minScore = options?.minScore ?? 0

  // Handle empty queries
  if (!question.trim()) {
    return {
      found: false,
      query: question,
      results: [],
      context: '',
      sources: [],
    }
  }

  // Perform TF-IDF/BM25 search (primary method)
  const searchResults = await tfidfSearch(question, airportCode, topK)

  // Filter by minimum score
  const filteredResults = searchResults.filter((r) => r.score >= minScore)

  if (filteredResults.length === 0) {
    return {
      found: false,
      query: question,
      results: [],
      context: '',
      sources: [],
    }
  }

  // Build context string by concatenating relevant chunks
  const contextParts = filteredResults.map(
    (result, index) =>
      `[${index + 1}] ${result.content}`
  )
  const context = contextParts.join('\n\n---\n\n')

  // Deduplicate sources
  const uniqueSources = Array.from(
    new Map(
      filteredResults.map((r) => [r.source.fileName, r.source])
    ).values()
  )

  return {
    found: true,
    query: question,
    results: filteredResults,
    context,
    sources: uniqueSources.map((s) => ({
      title: s.title,
      fileName: s.fileName,
    })),
  }
}

// ─── Ingest Pipeline ───────────────────────────────────────────────────

/**
 * Ingest a document into the knowledge base:
 * 1. Load KB record from DB
 * 2. Parse the document (from content field or fileUrl)
 * 3. Split into chunks
 * 4. Store chunks in DB
 * 5. Update KB status
 */
export async function ingestDocument(
  kbId: string
): Promise<{ chunks: number; status: string }> {
  // Load the KnowledgeBase record
  const kb = await db.knowledgeBase.findUnique({
    where: { id: kbId },
  })

  if (!kb) {
    throw new Error(`KnowledgeBase record not found: ${kbId}`)
  }

  // Mark as processing
  await db.knowledgeBase.update({
    where: { id: kbId },
    data: { status: 'processing', errorMessage: null },
  })

  try {
    // Step 1: Get the raw text content
    let rawText = ''

    if (kb.content && kb.content.trim()) {
      // Content is already stored as text
      rawText = kb.content
    } else if (kb.fileUrl) {
      // Fetch the file from URL and parse
      const response = await fetch(kb.fileUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch document from ${kb.fileUrl}: ${response.status}`)
      }
      const buffer = Buffer.from(await response.arrayBuffer())
      rawText = await parseDocument(buffer, kb.fileType)
    } else {
      throw new Error('No content or fileUrl available for ingestion')
    }

    if (!rawText.trim()) {
      throw new Error('Extracted text is empty after parsing')
    }

    // Step 2: Split into chunks
    const chunks = splitIntoChunks(rawText, {
      chunkSize: 500,
      overlap: 100,
    })

    if (chunks.length === 0) {
      throw new Error('No chunks generated from document')
    }

    // Step 3: Remove any existing chunks for this KB (idempotent re-ingestion)
    await db.documentChunk.deleteMany({
      where: { kbId },
    })

    // Step 4: Store chunks in the database
    const createData = chunks.map((chunk) => ({
      kbId,
      content: chunk.content,
      chunkIndex: (chunk.metadata.chunkIndex as number) || 0,
      tokenCount: (chunk.metadata.tokenCount as number) || approximateTokenCount(chunk.content),
      metadata: JSON.stringify(chunk.metadata),
    }))

    // Insert in batches to avoid potential limits
    const BATCH_SIZE = 50
    for (let i = 0; i < createData.length; i += BATCH_SIZE) {
      const batch = createData.slice(i, i + BATCH_SIZE)
      await db.documentChunk.createMany({ data: batch })
    }

    // Step 5: Update KnowledgeBase status to indexed
    const updatedKB = await db.knowledgeBase.update({
      where: { id: kbId },
      data: {
        status: 'indexed',
        chunkCount: chunks.length,
        processedAt: new Date(),
      },
    })

    return {
      chunks: updatedKB.chunkCount,
      status: updatedKB.status,
    }
  } catch (error) {
    // Mark as error with error message
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown ingestion error'

    await db.knowledgeBase.update({
      where: { id: kbId },
      data: {
        status: 'error',
        errorMessage,
      },
    })

    throw new Error(`Document ingestion failed: ${errorMessage}`)
  }
}

// ─── Knowledge Base CRUD Helpers ───────────────────────────────────────

/**
 * List all knowledge bases for an airport.
 */
export async function listKnowledgeBases(params: {
  airportCode?: string
  isActive?: boolean
  status?: string
  page?: number
  limit?: number
}) {
  const where: Record<string, unknown> = {
    airportCode: params.airportCode || 'DSS',
  }
  if (params.isActive !== undefined) where.isActive = params.isActive
  if (params.status) where.status = params.status

  const page = params.page || 1
  const limit = params.limit || 20

  const [items, total] = await Promise.all([
    db.knowledgeBase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.knowledgeBase.count({ where }),
  ])

  return { items, total, pages: Math.ceil(total / limit) }
}

/**
 * Get a single knowledge base by ID with its chunks.
 */
export async function getKnowledgeBase(id: string) {
  return db.knowledgeBase.findUnique({
    where: { id },
    include: {
      chunks: {
        orderBy: { chunkIndex: 'asc' },
      },
    },
  })
}

/**
 * Create a new knowledge base entry.
 */
export async function createKnowledgeBase(data: {
  airportCode?: string
  title: string
  fileName: string
  fileType: string
  fileSize?: number
  fileUrl?: string
  content?: string
  uploadedBy: string
}) {
  return db.knowledgeBase.create({
    data: {
      airportCode: data.airportCode || 'DSS',
      title: data.title,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize || 0,
      fileUrl: data.fileUrl,
      content: data.content,
      uploadedBy: data.uploadedBy,
      status: 'pending',
    },
  })
}

/**
 * Delete a knowledge base and all its chunks (cascade).
 */
export async function deleteKnowledgeBase(id: string) {
  return db.knowledgeBase.delete({
    where: { id },
  })
}

/**
 * Update knowledge base active status.
 */
export async function toggleKnowledgeBaseActive(
  id: string,
  isActive: boolean
) {
  return db.knowledgeBase.update({
    where: { id },
    data: { isActive },
  })
}

// ─── Utilities ─────────────────────────────────────────────────────────

/**
 * Safe JSON parse that returns empty object on failure.
 */
function safeJsonParse(jsonString: string | null | undefined): Record<string, unknown> {
  if (!jsonString) return {}
  try {
    const parsed = JSON.parse(jsonString)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}
