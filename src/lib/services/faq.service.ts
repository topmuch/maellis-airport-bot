import { db } from '@/lib/db'

// ═══════════════════════════════════════════════════════════════════════════
// FAQ Service — Intelligent FAQ matching with NLP-like scoring
// Smartly Assistant — WhatsApp AI Airport Chatbot
// ═══════════════════════════════════════════════════════════════════════════

// ─── Types ─────────────────────────────────────────────────────────────

export interface MultilingualText {
  fr?: string
  en?: string
  wo?: string
  ar?: string
}

export interface FAQMatch {
  faq: {
    id: string
    question: MultilingualText
    answer: MultilingualText
    category: string
  }
  score: number        // 0-1 confidence
  matchedAnswer: string // Answer in the detected language
}

export interface FAQSearchResult {
  matched: boolean
  faq?: FAQMatch
  suggestions?: string[]  // Related questions if no exact match
  shouldFallback: boolean  // True if should escalate to human
}

export interface FAQStats {
  totalFAQs: number
  activeFAQs: number
  totalQueries: number
  resolvedQueries: number
  resolutionRate: number
  unresolvedQueries: number
  topCategories: { category: string; count: number }[]
  recentUnresolved: { question: string; timestamp: Date; language: string }[]
  pendingSuggestions: number
}

// ─── Language Detection (simple keyword-based) ─────────────────────────

const LANGUAGE_PATTERNS: Record<string, RegExp[]> = {
  wo: [
    /\b(na\s*la|la\s*bi|bu\s*la|defar|lou\s*la|ja\s*ay|sa\s*bop|ba\s*tey|kontaan|waral|dafa|damay|lu\s*bokk|mann)\b/i,
    /\b(sama|yor|foo|baay|ndey|mag|góor|jigéen|xaam|dëgg|juddu|wàcc|cee)\b/i,
  ],
  ar: [/[\u0600-\u06FF]/],
  en: [
    /\b(where|what|how|when|is|are|can|do|does|the|my|your|i\s*need|i\s*want|please|help|airport|flight|baggage|parking|taxi|restaurant|wifi|toilet|lost|emergency)\b/i,
  ],
}

function detectLanguage(text: string): string {
  // Check Wolof first (more specific)
  if (LANGUAGE_PATTERNS.wo.some((r) => r.test(text))) return 'wo'
  // Check Arabic (Unicode range)
  if (LANGUAGE_PATTERNS.ar.some((r) => r.test(text))) return 'ar'
  // Check English
  if (LANGUAGE_PATTERNS.en.some((r) => r.test(text))) return 'en'
  // Default to French
  return 'fr'
}

// ─── Text Normalization ────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s]/g, ' ')       // Remove punctuation
    .replace(/\s+/g, ' ')           // Collapse whitespace
    .trim()
}

// ─── Jaro-Winkler Similarity ───────────────────────────────────────────

function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1
  if (!s1.length || !s2.length) return 0

  const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1
  const s1Matches = new Array(s1.length).fill(false)
  const s2Matches = new Array(s2.length).fill(false)

  let matches = 0
  let transpositions = 0

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance)
    const end = Math.min(i + matchDistance + 1, s2.length)

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }

  if (!matches) return 0

  let k = 0
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }

  const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3

  // Winkler modification: boost for common prefix
  let prefix = 0
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefix++
    else break
  }

  return jaro + prefix * 0.1 * (1 - jaro)
}

// ─── Keyword Matching Score ────────────────────────────────────────────

function keywordScore(normalizedInput: string, keywords: string[]): number {
  if (!keywords.length) return 0

  const inputWords = normalizedInput.split(' ').filter(Boolean)
  let matched = 0
  let totalWeight = 0

  for (const keyword of keywords) {
    const normalizedKw = normalize(keyword)
    const weight = normalizedKw.split(' ').length // Multi-word keywords worth more
    totalWeight += weight

    // Exact word match
    if (inputWords.some((w) => w === normalizedKw || w.includes(normalizedKw) || normalizedKw.includes(w))) {
      matched += weight
      continue
    }

    // Partial match via similarity
    for (const word of inputWords) {
      if (jaroWinkler(word, normalizedKw) > 0.85) {
        matched += weight * 0.8
        break
      }
    }
  }

  return totalWeight > 0 ? matched / totalWeight : 0
}

// ─── Category Guessing ─────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  baggage: ['bagage', 'sac', 'valise', 'malette', 'consigne', 'perdu', 'baggage', 'luggage', 'lost', 'tapis', 'soute', 'enregistrement', 'damay'],
  money: ['argent', 'change', 'change', 'distributeur', 'dab', 'distributeur', 'carte', 'paiement', 'money', 'atm', 'cash', 'bank', 'frais', 'devise'],
  transport: ['parking', 'voiture', 'taxi', 'bus', 'navette', 'transport', 'location', 'louer', 'vehicule', 'uber', 'vtc', 'stationnement'],
  food: ['restaurant', 'manger', 'nourriture', 'café', 'cafe', 'bar', 'pharmacie', 'souvenir', 'duty', 'free', 'boutique', 'magasin', 'shopping', 'marche', 'alimentaire', 'boisson'],
  emergency: ['urgence', 'pompier', 'police', 'medecin', 'docteur', 'infirmerie', 'ambulance', 'toilette', 'wc', 'sanitaire', 'emergency', 'medical', 'fire', 'police'],
  other: [],
}

function guessCategory(text: string): string | null {
  const normalized = normalize(text)
  let bestCategory: string | null = null
  let bestScore = 0

  for (const [category, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywordScore(normalized, kws)
    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  }

  return bestScore > 0.3 ? bestCategory : null
}

// ─── Main FAQ Matching ────────────────────────────────────────────────

export async function matchFAQ(
  userQuestion: string,
  airportCode: string = 'DSS'
): Promise<FAQSearchResult> {
  const language = detectLanguage(userQuestion)
  const normalizedQuestion = normalize(userQuestion)
  const detectedCategory = guessCategory(userQuestion)

  // Fetch all active FAQs for this airport
  const allFAQs = await db.fAQ.findMany({
    where: { airportCode, isActive: true },
    orderBy: { priority: 'desc' },
  })

  if (!allFAQs.length) {
    return { matched: false, shouldFallback: true }
  }

  // Score each FAQ
  interface ScoredFAQ {
    faq: typeof allFAQs[0]
    score: number
  }

  const scored: ScoredFAQ[] = []

  for (const faq of allFAQs) {
    let score = 0
    const questionObj: MultilingualText = JSON.parse(faq.question)
    const keywords: string[] = JSON.parse(faq.keywords || '[]')

    // 1. Keyword matching (40% weight)
    const kwScore = keywordScore(normalizedQuestion, keywords)
    score += kwScore * 0.4

    // 2. Question text similarity (40% weight)
    const questionTexts = Object.values(questionObj).filter(Boolean) as string[]
    let bestTextScore = 0
    for (const qt of questionTexts) {
      const normalizedQt = normalize(qt)
      // Full question similarity
      const fullSimilarity = jaroWinkler(normalizedQuestion, normalizedQt)
      // Check if input contains significant portion of question or vice versa
      const containment =
        normalizedQuestion.includes(normalizedQt.split(' ').slice(0, 3).join(' ')) ||
        normalizedQt.includes(normalizedQuestion.split(' ').slice(0, 3).join(' '))
      const textScore = Math.max(fullSimilarity, containment ? 0.6 : 0)
      bestTextScore = Math.max(bestTextScore, textScore)
    }
    score += bestTextScore * 0.4

    // 3. Category boost (20% weight)
    if (detectedCategory && faq.category === detectedCategory) {
      score += 0.2
    }

    // 4. Priority bonus (small boost)
    score += faq.priority * 0.01

    scored.push({ faq, score })
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  const bestMatch = scored[0]
  const MIN_MATCH_THRESHOLD = 0.35

  // Log analytics (non-blocking)
  logAnalytics(userQuestion, bestMatch?.score >= MIN_MATCH_THRESHOLD ? bestMatch.faq.id : null, bestMatch?.score >= MIN_MATCH_THRESHOLD, language, bestMatch?.score).catch(() => {})

  if (bestMatch && bestMatch.score >= MIN_MATCH_THRESHOLD) {
    const questionObj: MultilingualText = JSON.parse(bestMatch.faq.question)
    const answerObj: MultilingualText = JSON.parse(bestMatch.faq.answer)
    const matchedAnswer = answerObj[language as keyof MultilingualText] || answerObj.fr || Object.values(answerObj)[0] || ''

    // Increment view count
    db.fAQ.update({
      where: { id: bestMatch.faq.id },
      data: { viewCount: { increment: 1 }, resolvedCount: { increment: 1 } },
    }).catch(() => {})

    return {
      matched: true,
      faq: {
        faq: {
          id: bestMatch.faq.id,
          question: questionObj,
          answer: answerObj,
          category: bestMatch.faq.category,
        },
        score: bestMatch.score,
        matchedAnswer,
      },
      suggestions: scored.slice(1, 4).map((s) => {
        const q: MultilingualText = JSON.parse(s.faq.question)
        return q[language as keyof MultilingualText] || q.fr || ''
      }).filter(Boolean),
      shouldFallback: false,
    }
  }

  // No match found — suggest related questions
  const suggestions = scored
    .filter((s) => s.score >= MIN_MATCH_THRESHOLD * 0.6)
    .slice(0, 3)
    .map((s) => {
      const q: MultilingualText = JSON.parse(s.faq.question)
      return q[language as keyof MultilingualText] || q.fr || ''
    })
    .filter(Boolean)

  return {
    matched: false,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    shouldFallback: true,
  }
}

// ─── Analytics Logging (fire-and-forget) ──────────────────────────────

async function logAnalytics(
  userQuestion: string,
  faqId: string | null,
  matched: boolean,
  language: string,
  score?: number
): Promise<void> {
  try {
    await db.fAQAnalytics.create({
      data: {
        airportCode: 'DSS',
        faqId,
        userQuestion,
        matchedFAQ: matched,
        language,
        score: score ?? null,
      },
    })
  } catch {
    // Analytics should never block the main flow
  }
}

// ─── FAQ Statistics ────────────────────────────────────────────────────

export async function getFAQStats(airportCode: string = 'DSS'): Promise<FAQStats> {
  const [
    totalFAQs,
    activeFAQs,
    totalQueries,
    resolvedQueries,
    unresolvedQueries,
    pendingSuggestions,
  ] = await Promise.all([
    db.fAQ.count({ where: { airportCode } }),
    db.fAQ.count({ where: { airportCode, isActive: true } }),
    db.fAQAnalytics.count({ where: { airportCode } }),
    db.fAQAnalytics.count({ where: { airportCode, matchedFAQ: true } }),
    db.fAQAnalytics.count({ where: { airportCode, matchedFAQ: false } }),
    db.fAQSuggestion.count({ where: { airportCode, status: 'pending' } }),
  ])

  // Top categories by FAQ count
  const faqsByCategory = await db.fAQ.groupBy({
    by: ['category'],
    where: { airportCode, isActive: true },
    _count: true,
    orderBy: { _count: { category: 'desc' } },
  })

  const topCategories = faqsByCategory.map((c) => ({
    category: c.category,
    count: c._count,
  }))

  // Recent unresolved questions
  const recentUnresolved = await db.fAQAnalytics.findMany({
    where: { airportCode, matchedFAQ: false },
    orderBy: { timestamp: 'desc' },
    take: 10,
    select: { userQuestion: true, timestamp: true, language: true },
  })

  return {
    totalFAQs,
    activeFAQs,
    totalQueries,
    resolvedQueries,
    unresolvedQueries,
    resolutionRate: totalQueries > 0 ? resolvedQueries / totalQueries : 0,
    topCategories,
    recentUnresolved: recentUnresolved.map((r) => ({
      question: r.userQuestion,
      timestamp: r.timestamp,
      language: r.language,
    })),
    pendingSuggestions,
  }
}

// ─── FAQ CRUD ──────────────────────────────────────────────────────────

export async function createFAQ(data: {
  airportCode?: string
  category: string
  question: MultilingualText
  answer: MultilingualText
  keywords: string[]
  priority?: number
}) {
  return db.fAQ.create({
    data: {
      airportCode: data.airportCode || 'DSS',
      category: data.category,
      question: JSON.stringify(data.question),
      answer: JSON.stringify(data.answer),
      keywords: JSON.stringify(data.keywords || []),
      priority: data.priority || 0,
    },
  })
}

export async function updateFAQ(
  id: string,
  data: {
    category?: string
    question?: MultilingualText
    answer?: MultilingualText
    keywords?: string[]
    priority?: number
    isActive?: boolean
  }
) {
  const updateData: Record<string, unknown> = {}
  if (data.category !== undefined) updateData.category = data.category
  if (data.question !== undefined) updateData.question = JSON.stringify(data.question)
  if (data.answer !== undefined) updateData.answer = JSON.stringify(data.answer)
  if (data.keywords !== undefined) updateData.keywords = JSON.stringify(data.keywords)
  if (data.priority !== undefined) updateData.priority = data.priority
  if (data.isActive !== undefined) updateData.isActive = data.isActive

  return db.fAQ.update({ where: { id }, data: updateData })
}

export async function deleteFAQ(id: string) {
  return db.fAQ.delete({ where: { id } })
}

export async function getFAQs(params: {
  airportCode?: string
  category?: string
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
}) {
  const where: Record<string, unknown> = {
    airportCode: params.airportCode || 'DSS',
  }
  if (params.category) where.category = params.category
  if (params.isActive !== undefined) where.isActive = params.isActive
  if (params.search) {
    where.OR = [
      { question: { contains: params.search } },
      { answer: { contains: params.search } },
      { keywords: { contains: params.search } },
    ]
  }

  const page = params.page || 1
  const limit = params.limit || 20

  const [faqs, total] = await Promise.all([
    db.fAQ.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.fAQ.count({ where }),
  ])

  return { faqs, total, pages: Math.ceil(total / limit) }
}

export async function getFAQById(id: string) {
  return db.fAQ.findUnique({ where: { id } })
}

// ─── Suggestions CRUD ──────────────────────────────────────────────────

export async function getSuggestions(params: {
  airportCode?: string
  status?: string
  limit?: number
}) {
  return db.fAQSuggestion.findMany({
    where: {
      airportCode: params.airportCode || 'DSS',
      ...(params.status ? { status: params.status } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: params.limit || 50,
  })
}

export async function approveSuggestion(id: string) {
  const suggestion = await db.fAQSuggestion.findUnique({ where: { id } })
  if (!suggestion) throw new Error('Suggestion not found')

  // Create FAQ from suggestion
  await db.fAQ.create({
    data: {
      airportCode: suggestion.airportCode,
      category: suggestion.category || 'other',
      question: JSON.stringify({ fr: suggestion.question }),
      answer: JSON.stringify({ fr: suggestion.proposedAnswer || '' }),
      keywords: JSON.stringify([]),
      priority: 0,
    },
  })

  return db.fAQSuggestion.update({
    where: { id },
    data: { status: 'approved' },
  })
}

export async function rejectSuggestion(id: string) {
  return db.fAQSuggestion.update({
    where: { id },
    data: { status: 'rejected' },
  })
}
