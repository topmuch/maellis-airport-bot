import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { invalidateExternalConfigCache } from '@/lib/external-api-client'
import { z } from 'zod'

// ── GET /api/admin/config/external ──────────────────────────────────────────
// Retourne la config (masque les secrets — montre 4 derniers caractères)
export async function GET(_request: NextRequest) {
  const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN')
  const authResult = await checkRole(_request)
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Accès refusé' }, { status: authResult.status || 401 })
  }

  try {
    const config = await db.externalApiConfig.upsert({
      where: { id: 'global' },
      create: { id: 'global', updatedAt: new Date() },
      update: {},
    })

    const mask = (value: string | null | undefined) => {
      if (!value) return null
      return value.length <= 4 ? '••••' : `••••${value.slice(-4)}`
    }

    return NextResponse.json({
      success: true,
      data: {
        aviationStackKey: mask(config.aviationStackKey),
        hasAviationStackKey: !!config.aviationStackKey,
        aviationStackUrl: config.aviationStackUrl || 'http://api.aviationstack.com/v1',
        groqApiKey: mask(config.groqApiKey),
        hasGroqApiKey: !!config.groqApiKey,
        groqModel: config.groqModel || 'llama3-8b-8192',
        groqBaseUrl: config.groqBaseUrl || 'https://api.groq.com/openai/v1',
        metaAccessToken: mask(config.metaAccessToken),
        hasMetaAccessToken: !!config.metaAccessToken,
        metaPhoneNumberId: config.metaPhoneNumberId || null,
        metaAppId: config.metaAppId || null,
        metaWebhookVerify: config.metaWebhookVerify || null,
        updatedAt: config.updatedAt,
      },
    })
  } catch (error) {
    console.error('[config/external] GET error:', error)
    return NextResponse.json({ success: false, error: 'Erreur lecture config' }, { status: 500 })
  }
}

// ── PUT /api/admin/config/external ──────────────────────────────────────────
// Sauvegarde la config et invalide le cache
const updateSchema = z.object({
  aviationStackKey: z.string().max(500).optional(),
  aviationStackUrl: z.string().url().max(500).optional(),
  groqApiKey: z.string().max(500).optional(),
  groqModel: z.string().max(100).optional(),
  groqBaseUrl: z.string().url().max(500).optional(),
  metaAccessToken: z.string().max(1000).optional(),
  metaPhoneNumberId: z.string().max(100).optional(),
  metaAppId: z.string().max(100).optional(),
  metaWebhookVerify: z.string().max(200).optional(),
})

export async function PUT(request: NextRequest) {
  const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN')
  const authResult = await checkRole(request)
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Accès refusé' }, { status: authResult.status || 401 })
  }

  try {
    const raw = await request.json().catch(() => null)
    if (!raw) {
      return NextResponse.json({ success: false, error: 'JSON invalide' }, { status: 400 })
    }

    const parsed = updateSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: parsed.error.issues },
        { status: 400 },
      )
    }

    const data = parsed.data

    await db.externalApiConfig.upsert({
      where: { id: 'global' },
      create: {
        id: 'global',
        updatedAt: new Date(),
        aviationStackKey: data.aviationStackKey || null,
        aviationStackUrl: data.aviationStackUrl || 'http://api.aviationstack.com/v1',
        groqApiKey: data.groqApiKey || null,
        groqModel: data.groqModel || 'llama3-8b-8192',
        groqBaseUrl: data.groqBaseUrl || 'https://api.groq.com/openai/v1',
        metaAccessToken: data.metaAccessToken || null,
        metaPhoneNumberId: data.metaPhoneNumberId || null,
        metaAppId: data.metaAppId || null,
        metaWebhookVerify: data.metaWebhookVerify || null,
      },
      update: {
        ...(data.aviationStackKey !== undefined && { aviationStackKey: data.aviationStackKey || null }),
        ...(data.aviationStackUrl !== undefined && { aviationStackUrl: data.aviationStackUrl || 'http://api.aviationstack.com/v1' }),
        ...(data.groqApiKey !== undefined && { groqApiKey: data.groqApiKey || null }),
        ...(data.groqModel !== undefined && { groqModel: data.groqModel || 'llama3-8b-8192' }),
        ...(data.groqBaseUrl !== undefined && { groqBaseUrl: data.groqBaseUrl || 'https://api.groq.com/openai/v1' }),
        ...(data.metaAccessToken !== undefined && { metaAccessToken: data.metaAccessToken || null }),
        ...(data.metaPhoneNumberId !== undefined && { metaPhoneNumberId: data.metaPhoneNumberId || null }),
        ...(data.metaAppId !== undefined && { metaAppId: data.metaAppId || null }),
        ...(data.metaWebhookVerify !== undefined && { metaWebhookVerify: data.metaWebhookVerify || null }),
      },
    })

    // Invalider le cache pour que les prochains appels utilisent la nouvelle config
    invalidateExternalConfigCache()

    // Aussi invalider le cache du FlightProvider (utilise aussi aviationStackKey)
    try {
      const { invalidateFlightProviderCache } = await import('@/lib/flight-providers/FlightProviderFactory')
      invalidateFlightProviderCache()
    } catch { /* ok */ }

    return NextResponse.json({ success: true, message: 'Configuration API externe mise à jour' })
  } catch (error) {
    console.error('[config/external] PUT error:', error)
    return NextResponse.json({ success: false, error: 'Erreur sauvegarde config' }, { status: 500 })
  }
}
