import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// ── GET /api/admin/config/flight-provider ─────────────────────────────────
// Retourne la config actuelle (masque les secrets sensibles)
export async function GET(request: NextRequest) {
  const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN')
  const authResult = await checkRole(request)
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Accès refusé' }, { status: authResult.status || 401 })
  }

  try {
    const config = await db.systemConfig.upsert({
      where: { id: 'global' },
      create: { id: 'global', updatedAt: new Date() },
      update: {},
    })

    // Masquer les secrets — ne montrer que les 4 derniers caractères
    const maskedKey = config.aviationStackKey
      ? `••••${config.aviationStackKey.slice(-4)}`
      : null

    // Masquer les valeurs sensibles dans les headers
    let maskedHeaders = null
    if (config.customFidsHeaders) {
      try {
        const headers = JSON.parse(config.customFidsHeaders) as Record<string, string>
        maskedHeaders = Object.fromEntries(
          Object.entries(headers).map(([k, v]) => [
            k.toLowerCase() === 'authorization'
              ? k
              : k,
            k.toLowerCase() === 'authorization' && v.length > 8
              ? `${v.slice(0, 8)}••••`
              : v,
          ])
        )
      } catch {
        maskedHeaders = { _error: 'JSON invalide' }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        flightProvider: config.flightProvider || 'AVIATION_STACK',
        aviationStackKey: maskedKey,
        hasAviationKey: !!config.aviationStackKey,
        customFidsUrl: config.customFidsUrl || null,
        customFidsHeaders: maskedHeaders,
        customFidsDataPath: config.customFidsDataPath || null,
        customFidsMapping: config.customFidsMapping ? JSON.parse(config.customFidsMapping) : null,
        updatedAt: config.updatedAt,
      },
    })
  } catch (error) {
    console.error('[flight-provider/config] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la lecture de la configuration' },
      { status: 500 },
    )
  }
}

// ── POST /api/admin/config/flight-provider ────────────────────────────────
// Sauvegarde la configuration et invalide le cache provider
const updateConfigSchema = z.object({
  flightProvider: z.enum(['AVIATION_STACK', 'CUSTOM_FIDS', 'MOCK']),
  aviationStackKey: z.string().max(500).optional(),
  customFidsUrl: z.string().url().max(500).optional(),
  customFidsHeaders: z.string().max(2000).optional(),
  customFidsDataPath: z.string().max(200).optional(),
  customFidsMapping: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN')
  const authResult = await checkRole(request)
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Accès refusé' }, { status: authResult.status || 401 })
  }

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
    }

    const parsed = updateConfigSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: parsed.error.issues },
        { status: 400 },
      )
    }

    const { flightProvider, aviationStackKey, customFidsUrl, customFidsHeaders, customFidsDataPath, customFidsMapping } = parsed.data

    // Validation conditionnelle des champs
    if (flightProvider === 'AVIATION_STACK' && !aviationStackKey) {
      return NextResponse.json(
        { success: false, error: 'Clé AviationStack requise pour ce fournisseur' },
        { status: 400 },
      )
    }

    if (flightProvider === 'CUSTOM_FIDS' && !customFidsUrl) {
      return NextResponse.json(
        { success: false, error: 'URL FIDS requise pour ce fournisseur' },
        { status: 400 },
      )
    }

    // Valider que les headers et mapping sont du JSON valide
    if (customFidsHeaders) {
      try { JSON.parse(customFidsHeaders) } catch {
        return NextResponse.json({ success: false, error: 'Les headers doivent être du JSON valide' }, { status: 400 })
      }
    }
    if (customFidsMapping) {
      try { JSON.parse(customFidsMapping) } catch {
        return NextResponse.json({ success: false, error: 'Le mapping doit être du JSON valide' }, { status: 400 })
      }
    }

    // Mettre à jour la config
    await db.systemConfig.upsert({
      where: { id: 'global' },
      create: {
        id: 'global',
        updatedAt: new Date(),
        flightProvider,
        aviationStackKey: aviationStackKey || null,
        customFidsUrl: customFidsUrl || null,
        customFidsHeaders: customFidsHeaders || null,
        customFidsDataPath: customFidsDataPath || null,
        customFidsMapping: customFidsMapping || null,
      },
      update: {
        flightProvider,
        aviationStackKey: aviationStackKey || null,
        customFidsUrl: customFidsUrl || null,
        customFidsHeaders: customFidsHeaders || null,
        customFidsDataPath: customFidsDataPath || null,
        customFidsMapping: customFidsMapping || null,
      },
    })

    // Invalider le cache provider — les prochains appels utiliseront la nouvelle config
    const { invalidateFlightProviderCache } = await import('@/lib/flight-providers/FlightProviderFactory')
    invalidateFlightProviderCache()

    return NextResponse.json({
      success: true,
      message: `Fournisseur de vols mis à jour: ${flightProvider}`,
    })
  } catch (error) {
    console.error('[flight-provider/config] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la sauvegarde' },
      { status: 500 },
    )
  }
}
