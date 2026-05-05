import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'
import { parseBody, ValidationError } from '@/lib/validate'

/**
 * Mapping from settings keys to ExternalApiConfig Prisma fields.
 * When these keys are saved via PUT /api/settings, they are also synced
 * to ExternalApiConfig so that runtime API clients (jinaRequest, etc.)
 * read the correct values.
 */
const SETTINGS_TO_EXTERNAL_CONFIG: Record<string, string> = {
  jina_api_key: 'jinaApiKey',
  aviation_stack_key: 'aviationStackKey',
  groq_api_key: 'groqApiKey',
  ai_api_key: 'groqApiKey', // AI tab also saves Groq key under this key
  orange_money_api_key: 'orangeMoneyClientId',
  orange_money_client_secret: 'orangeMoneyClientSecret',
  orange_money_merchant_id: 'orangeMoneyMerchantId',
  wave_api_key: 'waveClientId',
  wave_client_secret: 'waveClientSecret',
}

// GET /api/settings - List all settings
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 })
  }
  try {
    const settings = await db.setting.findMany({
      orderBy: { group: 'asc' },
    })

    return NextResponse.json({ data: settings })
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT /api/settings - Update a setting
export async function PUT(request: NextRequest) {
  const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN')
  const authResult = await checkRole(request)
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: authResult.status || 401 })
  }
  try {
    const body = await parseBody(request)
    const { key, value } = body

    if (!key) {
      return NextResponse.json(
        { error: 'key is required' },
        { status: 400 }
      )
    }

    const setting = await db.setting.upsert({
      where: { key },
      update: { value },
      create: { id: crypto.randomUUID(), updatedAt: new Date(), key, value },
    })

    // If an SMTP/email setting was saved, refresh the email transporter
    if (key.startsWith('smtp_') || key.startsWith('email_')) {
      try {
        const { loadEmailConfigFromDb } = await import('@/lib/email/core')
        await loadEmailConfigFromDb()
      } catch (err) {
        console.warn('[settings] Failed to refresh email config after setting update:', err)
      }
    }

    // Sync API keys to ExternalApiConfig so runtime clients (jinaRequest, etc.) read correct values
    if (SETTINGS_TO_EXTERNAL_CONFIG[key]) {
      try {
        const prismaField = SETTINGS_TO_EXTERNAL_CONFIG[key]
        await db.externalApiConfig.upsert({
          where: { id: 'global' },
          update: { [prismaField]: value || null },
          create: { id: 'global', updatedAt: new Date(), [prismaField]: value || null },
        })
        const { invalidateExternalConfigCache } = await import('@/lib/external-api-client')
        invalidateExternalConfigCache()
        // Also invalidate flight provider cache so new API keys take effect immediately
        try {
          const { invalidateFlightProviderCache } = await import('@/lib/flight-providers/FlightProviderFactory')
          invalidateFlightProviderCache()
        } catch { /* ok — flight module may not be loaded */ }
        console.log(`[settings] Synced ${key} → ExternalApiConfig.${prismaField}`)
      } catch (err) {
        console.warn(`[settings] Failed to sync ${key} to ExternalApiConfig:`, err)
      }
    }

    return NextResponse.json(setting)
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error updating setting:', error)
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    )
  }
}
