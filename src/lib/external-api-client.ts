/**
 * Client HTTP centralisé pour les APIs externes
 *
 * PATTERNS:
 * 1. Lit les clés depuis ExternalApiConfig (DB) avec fallback sur env vars
 * 2. Cache en mémoire (TTL 5 min) pour éviter les requêtes DB excessives
 * 3. N'injecte JAMAIS de clé dans les réponses HTTP
 * 4. Valide les clés avant usage (non-empty, format basique)
 *
 * UTILISATION (côté serveur UNIQUEMENT):
 *   import { getExternalConfig, aviationStackRequest, groqRequest, metaRequest } from '@/lib/external-api-client'
 *   const result = await aviationStackRequest('/flights', { flight_icao: 'AF123' })
 */

import { db } from '@/lib/db'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExternalConfig {
  aviationStackKey: string
  aviationStackUrl: string
  groqApiKey: string
  groqModel: string
  groqBaseUrl: string
  metaAccessToken: string
  metaPhoneNumberId: string
  metaAppId: string
  metaWebhookVerify: string
  // Orange Money
  orangeMoneyClientId: string
  orangeMoneyClientSecret: string
  orangeMoneyMerchantId: string
  orangeMoneyBaseUrl: string
  // Wave
  waveClientId: string
  waveClientSecret: string
  waveBaseUrl: string
  // Jina AI Reader
  jinaApiKey: string
}

export interface ProxyResult {
  ok: boolean
  status: number
  data: unknown
  headers?: Record<string, string>
}

// ─── Cache ──────────────────────────────────────────────────────────────────

let cachedConfig: ExternalConfig | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Charge la config depuis la DB, avec fallback sur les variables d'environnement.
 * Met en cache pendant 5 minutes.
 */
export async function getExternalConfig(): Promise<ExternalConfig> {
  const now = Date.now()
  if (cachedConfig && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedConfig
  }

  try {
    const row = await db.externalApiConfig.upsert({
      where: { id: 'global' },
      create: { id: 'global' },
      update: {},
    })

    cachedConfig = {
      // AviationStack : DB > env
      aviationStackKey: row.aviationStackKey || process.env.AVIATION_STACK_KEY || process.env.AVIATION_API_KEY || '',
      aviationStackUrl: row.aviationStackUrl || 'http://api.aviationstack.com/v1',

      // Groq : DB > env
      groqApiKey: row.groqApiKey || process.env.GROQ_API_KEY || '',
      groqModel: row.groqModel || 'llama3-8b-8192',
      groqBaseUrl: row.groqBaseUrl || 'https://api.groq.com/openai/v1',

      // Meta/WhatsApp : DB > env
      metaAccessToken: row.metaAccessToken || process.env.WHATSAPP_ACCESS_TOKEN || '',
      metaPhoneNumberId: row.metaPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID || '',
      metaAppId: row.metaAppId || process.env.META_APP_ID || '',
      metaWebhookVerify: row.metaWebhookVerify || process.env.WHATSAPP_VERIFY_TOKEN || '',

      // Orange Money : DB > env
      orangeMoneyClientId: row.orangeMoneyClientId || process.env.ORANGE_MONEY_CLIENT_ID || '',
      orangeMoneyClientSecret: row.orangeMoneyClientSecret || process.env.ORANGE_MONEY_CLIENT_SECRET || '',
      orangeMoneyMerchantId: row.orangeMoneyMerchantId || process.env.ORANGE_MONEY_MERCHANT_ID || '',
      orangeMoneyBaseUrl: row.orangeMoneyBaseUrl || 'https://api.orange.com',

      // Wave : DB > env
      waveClientId: row.waveClientId || process.env.WAVE_CLIENT_ID || '',
      waveClientSecret: row.waveClientSecret || process.env.WAVE_CLIENT_SECRET || '',
      waveBaseUrl: row.waveBaseUrl || 'https://api.wave.com',

      // Jina AI Reader : DB > env
      jinaApiKey: row.jinaApiKey || process.env.JINA_API_KEY || '',
    }
  } catch (error) {
    console.error('[external-api-client] Failed to load config from DB, using env fallback:', error)
    cachedConfig = {
      aviationStackKey: process.env.AVIATION_STACK_KEY || process.env.AVIATION_API_KEY || '',
      aviationStackUrl: 'http://api.aviationstack.com/v1',
      groqApiKey: process.env.GROQ_API_KEY || '',
      groqModel: 'llama3-8b-8192',
      groqBaseUrl: 'https://api.groq.com/openai/v1',
      metaAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      metaPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID || '',
      metaAppId: process.env.META_APP_ID || '',
      metaWebhookVerify: process.env.WHATSAPP_VERIFY_TOKEN || '',

      // Orange Money : env fallback
      orangeMoneyClientId: process.env.ORANGE_MONEY_CLIENT_ID || '',
      orangeMoneyClientSecret: process.env.ORANGE_MONEY_CLIENT_SECRET || '',
      orangeMoneyMerchantId: process.env.ORANGE_MONEY_MERCHANT_ID || '',
      orangeMoneyBaseUrl: 'https://api.orange.com',

      // Wave : env fallback
      waveClientId: process.env.WAVE_CLIENT_ID || '',
      waveClientSecret: process.env.WAVE_CLIENT_SECRET || '',
      waveBaseUrl: 'https://api.wave.com',

      // Jina AI Reader : env fallback
      jinaApiKey: process.env.JINA_API_KEY || '',
    }
  }

  cacheTimestamp = now
  return cachedConfig
}

/**
 * Invalide le cache (à appeler après toute modification de config).
 */
export function invalidateExternalConfigCache(): void {
  cachedConfig = null
  cacheTimestamp = 0
}

// ─── AviationStack Proxy ────────────────────────────────────────────────────

/**
 * Proxy vers AviationStack. Injecte automatiquement `access_key` dans les query params.
 * @param endpoint - ex: '/flights', '/airports'
 * @param params - paramètres additionnels (flight_icao, limit, etc.)
 */
export async function aviationStackRequest(
  endpoint: string,
  params: Record<string, string> = {},
  timeoutMs = 15000,
): Promise<ProxyResult> {
  const config = await getExternalConfig()
  if (!config.aviationStackKey) {
    return { ok: false, status: 401, data: { error: 'Clé AviationStack non configurée' } }
  }

  const url = new URL(`${config.aviationStackUrl}${endpoint}`)
  url.searchParams.set('access_key', config.aviationStackKey)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(timeoutMs) })
    const data = await res.json().catch(() => null)
    return { ok: res.ok, status: res.status, data }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Timeout ou erreur réseau'
    return { ok: false, status: 502, data: { error: `AviationStack indisponible: ${msg}` } }
  }
}

// ─── Groq Proxy ─────────────────────────────────────────────────────────────

/**
 * Proxy vers Groq API (compatible OpenAI). Injecte le Bearer token.
 * @param endpoint - ex: '/chat/completions', '/models'
 * @param body - corps JSON (model, messages, temperature, etc.)
 */
export async function groqRequest(
  endpoint: string,
  body?: Record<string, unknown>,
  timeoutMs = 30000,
): Promise<ProxyResult> {
  const config = await getExternalConfig()
  if (!config.groqApiKey) {
    return { ok: false, status: 401, data: { error: 'Clé Groq non configurée' } }
  }

  const url = `${config.groqBaseUrl}${endpoint}`

  try {
    const res = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: {
        'Authorization': `Bearer ${config.groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    })
    const data = await res.json().catch(() => null)
    return { ok: res.ok, status: res.status, data }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Timeout ou erreur réseau'
    return { ok: false, status: 502, data: { error: `Groq indisponible: ${msg}` } }
  }
}

// ─── Jina AI Reader Proxy ───────────────────────────────────────────────────

/**
 * Proxy vers Jina AI Reader API. Extrait le contenu textuel d'une URL.
 *
 * Avec clé API : utilise r.jina.ai avec header Authorization.
 * Sans clé API : utilise le endpoint public r.jina.ai (sans auth, limité).
 *
 * @param url - L'URL à extraire
 * @param options - options supplémentaires
 * @returns ProxyResult avec le contenu textuel (data = { content, title, url })
 */
export async function jinaRequest(
  url: string,
  options: { timeoutMs?: number; returnFormat?: 'text' | 'html' | 'markdown' } = {},
): Promise<ProxyResult> {
  const config = await getExternalConfig()
  const timeoutMs = options.timeoutMs ?? 30_000
  const format = options.returnFormat || 'text'

  // Build Jina Reader URL
  const jinaReaderUrl = `https://r.jina.ai/${encodeURIComponent(url)}`

  try {
    const headers: Record<string, string> = {
      'Accept': format === 'markdown' ? 'text/markdown' : 'text/plain',
      'X-Return-Format': format,
      'X-No-Cache': 'true',
    }

    // If API key is configured, use it for higher rate limits
    if (config.jinaApiKey) {
      headers['Authorization'] = `Bearer ${config.jinaApiKey}`
    }

    const res = await fetch(jinaReaderUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return {
        ok: false,
        status: res.status,
        data: { error: `Jina Reader HTTP ${res.status}: ${text.slice(0, 200)}` },
      }
    }

    // Jina returns plain text with metadata headers
    const rawContent = await res.text()

    // Parse and clean Jina metadata headers
    const cleaned = rawContent
      .replace(/^Title:\s*.*/im, '')
      .replace(/^URL:\s*.*/im, '')
      .replace(/^Description:\s*.*/im, '')
      .replace(/^Author:\s*.*/im, '')
      .replace(/^Source:\s*.*/im, '')
      .trim()

    return {
      ok: true,
      status: res.status,
      data: {
        content: cleaned,
        url,
        format,
      },
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Timeout ou erreur réseau'
    return { ok: false, status: 502, data: { error: `Jina Reader indisponible: ${msg}` } }
  }
}

// ─── Meta / WhatsApp Proxy ─────────────────────────────────────────────────

/**
 * Proxy vers Meta Graph API (WhatsApp Cloud API). Injecte le Bearer token.
 * @param endpoint - ex: '/v18.0/{phoneId}/messages'
 * @param body - corps JSON (messaging_product, to, type, etc.)
 */
export async function metaRequest(
  endpoint: string,
  body?: Record<string, unknown>,
  method: 'GET' | 'POST' | 'DELETE' = body ? 'POST' : 'GET',
  timeoutMs = 15000,
): Promise<ProxyResult> {
  const config = await getExternalConfig()
  if (!config.metaAccessToken) {
    return { ok: false, status: 401, data: { error: 'Token Meta/WhatsApp non configuré' } }
  }

  const url = endpoint.startsWith('http') ? endpoint : `https://graph.facebook.com${endpoint}`

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${config.metaAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    })
    const data = await res.json().catch(() => null)
    return { ok: res.ok, status: res.status, data }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Timeout ou erreur réseau'
    return { ok: false, status: 502, data: { error: `Meta API indisponible: ${msg}` } }
  }
}
