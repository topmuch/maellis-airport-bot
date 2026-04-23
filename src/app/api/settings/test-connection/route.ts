import { NextResponse } from 'next/server'

// ── POST /api/settings/test-connection ──────────────────────────────────────
// Tests connectivity for a specific service without saving anything.
// Body: { type: 'aviation' | 'groq' | 'whatsapp' | 'email' | 'payment' | 'jwt' }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type } = body

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: type' },
        { status: 400 },
      )
    }

    let result: { connected: boolean; message: string; latencyMs?: number }

    switch (type) {
      case 'aviation': {
        const key = process.env.AVIATION_STACK_KEY
        if (!key) {
          result = { connected: false, message: 'Clé AviationStack non configurée' }
          break
        }
        const start = Date.now()
        try {
          const res = await fetch(
            `http://api.aviationstack.com/v1/airports?access_key=${key}&limit=1`,
            { signal: AbortSignal.timeout(5000) },
          )
          const latency = Date.now() - start
          if (res.ok) {
            const data = await res.json()
            result = {
              connected: true,
              message: `Connecté (${data.pagination?.total || 0} aéroports)`,
              latencyMs: latency,
            }
          } else {
            result = { connected: false, message: `Erreur HTTP ${res.status}` }
          }
        } catch {
          result = { connected: false, message: 'Impossible de joindre AviationStack' }
        }
        break
      }

      case 'groq': {
        const key = process.env.GROQ_API_KEY
        if (!key) {
          result = { connected: false, message: 'Clé Groq non configurée' }
          break
        }
        const start = Date.now()
        try {
          const res = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { Authorization: `Bearer ${key}` },
            signal: AbortSignal.timeout(5000),
          })
          const latency = Date.now() - start
          if (res.ok) {
            result = {
              connected: true,
              message: 'Connecté — modèles accessibles',
              latencyMs: latency,
            }
          } else {
            result = { connected: false, message: `Erreur HTTP ${res.status} — clé invalide?` }
          }
        } catch {
          result = { connected: false, message: 'Impossible de joindre Groq API' }
        }
        break
      }

      case 'whatsapp': {
        const token = process.env.WHATSAPP_ACCESS_TOKEN
        const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
        if (!token || !phoneId) {
          result = { connected: false, message: 'Token ou Phone Number ID manquant' }
          break
        }
        const start = Date.now()
        try {
          const res = await fetch(
            `https://graph.facebook.com/v18.0/${phoneId}?access_token=${token}`,
            { signal: AbortSignal.timeout(5000) },
          )
          const latency = Date.now() - start
          if (res.ok) {
            const data = await res.json()
            result = {
              connected: true,
              message: `Connecté — ${data.display_phone_number || phoneId}`,
              latencyMs: latency,
            }
          } else {
            const errData = await res.json().catch(() => ({}))
            result = {
              connected: false,
              message: `Erreur: ${errData?.error?.message || res.status}`,
            }
          }
        } catch {
          result = { connected: false, message: 'Impossible de joindre Meta API' }
        }
        break
      }

      case 'email': {
        try {
          const { testSmtpConnection } = await import('@/lib/email/core')
          result = await testSmtpConnection()
        } catch {
          result = { connected: false, message: 'Erreur vérification email' }
        }
        break
      }

      case 'payment': {
        const apiKey = process.env.CINETPAY_API_KEY
        const siteId = process.env.CINETPAY_SITE_ID
        if (!apiKey || !siteId) {
          result = { connected: false, message: 'Clés CinetPay non configurées' }
          break
        }
        const start = Date.now()
        try {
          const res = await fetch('https://api.cinetpay.com/v2/check/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apikey: apiKey, site_id: siteId }),
            signal: AbortSignal.timeout(5000),
          })
          const latency = Date.now() - start
          // CinetPay returns data even with test calls
          result = {
            connected: true,
            message: `Connecté (Site ID: ${siteId})`,
            latencyMs: latency,
          }
        } catch {
          result = { connected: false, message: 'Impossible de joindre CinetPay' }
        }
        break
      }

      case 'jwt': {
        const secret = process.env.JWT_SECRET
        if (!secret) {
          result = { connected: false, message: 'JWT_SECRET non configuré' }
          break
        }
        result = {
          connected: true,
          message: `Clé configurée (${secret.length} caractères)`,
        }
        break
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown connection type: ${type}` },
          { status: 400 },
        )
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('[settings/test-connection] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to test connection' },
      { status: 500 },
    )
  }
}
