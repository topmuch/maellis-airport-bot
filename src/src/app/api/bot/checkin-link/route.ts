import { NextRequest, NextResponse } from 'next/server'
import { generateCheckinLink, formatWhatsAppMessage, formatWhatsAppErrorMessage, maskPnr } from '@/lib/deep-linking.service'
import { createCheckInSession } from '@/lib/services/checkin.service'
import { invalidateAnalyticsCache } from '@/lib/checkin-analytics.service'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

// ── POST /api/bot/checkin-link ──────────────────────────────────────────────
// Point d'intégration WhatsApp ↔ Deep Linking.
// Le bot détecte un PNR + code IATA, appel cette route qui :
//   1. Génère le lien de check-in via deep-linking.service
//   2. Formate le message WhatsApp
//   3. Crée une CheckInSession pour l'analytics
//   4. Retourne le message prêt à envoyer
//
// Body : { iataCode, pnr, phone?, passengerName?, flightNumber?, departureCode?, arrivalCode?, flightDate? }
// Response : { success, whatsappMessage, checkinUrl?, session? }

const checkinLinkSchema = z.object({
  iataCode: z.string().min(2).max(10),
  pnr: z.string().min(5).max(6),
  phone: z.string().optional(),
  passengerName: z.string().max(200).optional(),
  flightNumber: z.string().max(20).optional(),
  departureCode: z.string().max(10).optional(),
  arrivalCode: z.string().max(10).optional(),
  flightDate: z.string().max(20).optional(),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  // Rate limit (par IP)
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  const { success, remaining } = rateLimit(`bot:checkin:${clientIp}`, RATE_LIMITS.botChat)
  if (!success) {
    return NextResponse.json(
      { success: false, error: 'Trop de requêtes. Réessayez plus tard.', remaining: 0 },
      { status: 429 },
    )
  }

  try {
    // Parse & validate body
    let body: z.infer<typeof checkinLinkSchema>
    try {
      const raw = await request.json()
      const parsed = checkinLinkSchema.safeParse(raw)
      if (!parsed.success) {
        return NextResponse.json({
          success: false,
          error: 'Données invalides',
          details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        }, { status: 400 })
      }
      body = parsed.data
    } catch {
      return NextResponse.json(
        { success: false, error: 'JSON invalide' },
        { status: 400 },
      )
    }

    const { iataCode, pnr, phone, passengerName, flightNumber, departureCode, arrivalCode, flightDate } = body

    // 1. Générer le lien de check-in
    const linkResult = await generateCheckinLink({ iataCode, pnr })

    console.info(
      `[bot/checkin-link] iata=${iataCode} pnr=${maskPnr(pnr)} success=${linkResult.success} phone=${phone || 'N/A'} ` +
      `duration=${Date.now() - startTime}ms`,
    )

    // 2. Créer la CheckInSession pour l'analytics (non-bloquant)
    if (phone) {
      createCheckInSession({
        phone,
        passengerName,
        flightNumber: flightNumber || '',
        airline: linkResult.airline || iataCode,
        pnr,
        departureCode,
        arrivalCode,
        flightDate,
        checkInUrl: linkResult.url || undefined,
        status: linkResult.success ? 'link_generated' : 'failed',
      })
        .then(() => {
          invalidateAnalyticsCache()
          console.info(`[bot/checkin-link] session créée pour phone=${phone} iata=${iataCode}`)
        })
        .catch((err) => {
          console.error(`[bot/checkin-link] erreur création session:`, err)
        })
    }

    // 3. Formater le message WhatsApp
    if (linkResult.success && linkResult.url && linkResult.airline) {
      const whatsappMessage = formatWhatsAppMessage({
        passengerName: passengerName || 'Voyageur',
        airline: linkResult.airline,
        iataCode: linkResult.iataCode,
        flightNumber: flightNumber || '',
        pnr,
        checkinUrl: linkResult.url,
        departureCode,
        arrivalCode,
        flightDate,
      })

      return NextResponse.json({
        success: true,
        whatsappMessage,
        checkinUrl: linkResult.url,
        airline: linkResult.airline,
        intent: 'checkin_link',
        _duration: Date.now() - startTime,
      })
    }

    // 4. Message d'erreur formaté
    const errorMessage = formatWhatsAppErrorMessage({
      iataCode,
      pnr,
      reason: linkResult.message,
    })

    return NextResponse.json({
      success: false,
      whatsappMessage: errorMessage,
      checkinUrl: linkResult.url, // Peut contenir le lien générique
      airline: linkResult.airline,
      intent: 'checkin_link_failed',
      _duration: Date.now() - startTime,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne'
    console.error(`[bot/checkin-link] POST error: ${message}`)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}
