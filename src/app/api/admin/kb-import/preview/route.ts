import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { jinaRequest } from '@/lib/external-api-client'

// ── POST /api/admin/kb-import/preview ─────────────────────────────────────
// Extrait le contenu d'une URL via Jina AI Reader et retourne un aperçu.
// Utilise le proxy centralisé jinaRequest() pour la gestion d'auth,
// le timeout et le nettoyage des métadonnées.
export async function POST(request: NextRequest) {
  const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN')
  const authResult = await checkRole(request)
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Accès refusé' }, { status: authResult.status || 401 })
  }

  try {
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return NextResponse.json({ error: 'URL invalide — doit commencer par http:// ou https://' }, { status: 400 })
    }

    // Validate URL format
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Format d\'URL invalide' }, { status: 400 })
    }

    // Allowed domains whitelist (prevent SSRF attacks)
    // Jina AI Reader itself acts as a proxy, so we allow most public domains
    // but block private/internal networks for security
    const BLOCKED_DOMAINS = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '10.',
      '172.16.',
      '172.17.',
      '172.18.',
      '172.19.',
      '172.20.',
      '172.21.',
      '172.22.',
      '172.23.',
      '172.24.',
      '172.25.',
      '172.26.',
      '172.27.',
      '172.28.',
      '172.29.',
      '172.30.',
      '172.31.',
      '192.168.',
      '169.254.',
    ]

    const hostname = parsedUrl.hostname.toLowerCase()
    const isBlocked = BLOCKED_DOMAINS.some(blocked =>
      hostname === blocked || hostname.startsWith(blocked)
    )

    if (isBlocked) {
      return NextResponse.json({
        error: 'Domaine interne ou privé non autorisé.',
      }, { status: 400 })
    }

    // Extract content via Jina AI Reader (centralized proxy)
    const jinaResult = await jinaRequest(url, {
      timeoutMs: 30_000,
      returnFormat: 'text',
    })

    if (!jinaResult.ok || !jinaResult.data) {
      return NextResponse.json(
        { error: 'Échec de l\'extraction — aucun contenu récupéré. Vérifiez que l\'URL est accessible.' },
        { status: 502 },
      )
    }

    const jinaData = jinaResult.data as { content?: string; title?: string; url?: string }
    const cleaned = jinaData.content || ''

    if (cleaned.length < 50) {
      return NextResponse.json({
        error: 'Contenu trop court ou vide — la page ne contient probablement pas de contenu textuel exploitable.',
      }, { status: 422 })
    }

    // Limit to 50,000 characters for KB import
    const maxChars = 50_000
    const truncatedContent = cleaned.length > maxChars
      ? cleaned.slice(0, maxChars)
      : cleaned
    const wasTruncated = cleaned.length > maxChars

    // Preview: first 2000 chars for UI display
    const preview = truncatedContent.slice(0, 2000) + (truncatedContent.length > 2000 ? '...' : '')

    return NextResponse.json({
      success: true,
      preview,
      fullContent: truncatedContent,
      charCount: truncatedContent.length,
      originalCharCount: cleaned.length,
      estimatedChunks: Math.ceil(truncatedContent.length / 500),
      wasTruncated,
      sourceUrl: url,
      title: parsedUrl.hostname,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur d\'extraction'
    console.error('[kb-import/preview] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
