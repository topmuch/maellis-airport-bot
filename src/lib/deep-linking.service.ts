// ─────────────────────────────────────────────────────────────────────────────
// MAELLIS Airport Bot — Moteur de Deep Linking Check-in + Intégration WhatsApp
//
// RESPONSABILITÉS :
// 1. Générer un lien de check-in à partir du code IATA + PNR via template
// 2. Formater le message WhatsApp avec le lien de check-in
// 3. Tracker les événements de deep linking pour l'analytics
//
// PATTERNS :
// - Lecture template depuis CheckinAirline (Prisma) → remplacement {pnr}
// - PNR masqué dans les logs : pnr.slice(0,2) + '***'
// - Timeout 3s sur les opérations DB
// - Zéro type `any`
// - Logging structuré avec prefix [deep-linking]
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Paramètres d'entrée pour la génération de lien */
export interface GenerateCheckinLinkParams {
  iataCode: string
  pnr: string
}

/** Résultat de la génération de lien */
export interface CheckinLinkResult {
  success: boolean
  airline: string | null
  iataCode: string
  url: string | null
  message: string
}

/** Paramètres pour le formatage du message WhatsApp */
export interface WhatsAppCheckinParams {
  passengerName: string
  airline: string
  iataCode: string
  flightNumber: string
  pnr: string
  checkinUrl: string
  departureCode?: string
  arrivalCode?: string
  flightDate?: string
}

/** Données tracées pour l'analytics */
export interface DeepLinkEvent {
  id: string
  iataCode: string
  airline: string | null
  pnrMasked: string
  success: boolean
  url: string | null
  errorMessage: string | null
  createdAt: Date
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const TIMEOUT_MS = 3_000 // 3 secondes timeout DB

/** Lien de check-in générique par défaut (aucune compagnie reconnue) */
const GENERIC_CHECKIN_URL = 'https://www.check-in-airline.com/search'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Masque le PNR pour les logs : seuls les 2 premiers caractères sont visibles.
 * Ex: "ABC123" → "AB***"
 */
export function maskPnr(pnr: string): string {
  const cleaned = pnr.trim().toUpperCase()
  if (cleaned.length <= 2) return cleaned[0] + '***'
  return cleaned.slice(0, 2) + '***'
}

/**
 * Valide le format d'un code IATA (2-3 lettres, parfois suivi de _suffixe).
 * Accepte: "AF", "SN", "SN_BRU", etc.
 */
function isValidIataCode(code: string): boolean {
  const cleaned = code.trim().toUpperCase()
  // Format standard: 2-3 lettres, optionnellement suivi de _suffixe
  return /^[A-Z]{2,3}(_[A-Z]+)?$/.test(cleaned)
}

/**
 * Valide le format d'un PNR (code réservation alphanumérique, 5-6 caractères).
 */
function isValidPnr(pnr: string): boolean {
  const cleaned = pnr.trim().toUpperCase()
  return /^[A-Z0-9]{5,6}$/.test(cleaned)
}

/**
 * Wrapper avec timeout pour les opérations DB.
 * Lance une erreur si l'opération dépasse TIMEOUT_MS.
 */
async function withTimeout<T>(promise: Promise<T>, operation: string): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${operation} — timeout (${TIMEOUT_MS}ms)`)), TIMEOUT_MS)
  )
  return Promise.race([promise, timeoutPromise])
}

// ─── Service Core ────────────────────────────────────────────────────────────

/**
 * Génère un lien de check-in à partir d'un code IATA et d'un PNR.
 *
 * ALGORITHME :
 * 1. Valider iataCode + pnr
 * 2. Chercher la compagnie dans CheckinAirline (DB)
 * 3. Si trouvé et actif → appliquer le template (remplacement {pnr})
 * 4. Si le template ne contient pas {pnr} → ajouter ?pnr= à la fin
 * 5. Si non trouvé → retourner le lien générique
 *
 * @param params - iataCode (ex: "AF") + pnr (ex: "ABC123")
 * @returns CheckinLinkResult avec le lien généré ou un message d'erreur
 */
export async function generateCheckinLink(
  params: GenerateCheckinLinkParams,
): Promise<CheckinLinkResult> {
  const { iataCode, pnr } = params

  // 1. Validation
  if (!iataCode || !pnr) {
    console.warn('[deep-linking] generateCheckinLink: iataCode ou pnr manquant')
    return {
      success: false,
      airline: null,
      iataCode: iataCode || '?',
      url: null,
      message: 'Code IATA et PNR sont requis pour générer le lien de check-in.',
    }
  }

  const normalizedIata = iataCode.trim().toUpperCase()
  const normalizedPnr = pnr.trim().toUpperCase()

  if (!isValidIataCode(normalizedIata)) {
    console.warn(`[deep-linking] generateCheckinLink: iataCode invalide "${normalizedIata}"`)
    return {
      success: false,
      airline: null,
      iataCode: normalizedIata,
      url: null,
      message: `Le code IATA "${normalizedIata}" n'est pas reconnu. Vérifiez et réessayez.`,
    }
  }

  if (!isValidPnr(normalizedPnr)) {
    console.warn(`[deep-linking] generateCheckinLink: PNR invalide "${maskPnr(normalizedPnr)}"`)
    return {
      success: false,
      airline: null,
      iataCode: normalizedIata,
      url: null,
      message: 'Le numéro de réservation (PNR) doit contenir 5 ou 6 caractères alphanumériques.',
    }
  }

  // 2. Recherche en DB avec timeout 3s
  try {
    const dbAirline = await withTimeout(
      db.checkinAirline.findUnique({
        where: { iataCode: normalizedIata },
      }),
      'DB lookup CheckinAirline',
    )

    if (dbAirline && dbAirline.isActive && dbAirline.checkinUrl) {
      // 3. Template avec remplacement {pnr}
      let url: string
      if (dbAirline.checkinUrl.includes('{pnr}')) {
        // Template-style: https://www.airfrance.com/checkin?pnr={pnr}
        url = dbAirline.checkinUrl.replace('{pnr}', normalizedPnr)
      } else {
        // Legacy-style: append ?pnr= or &pnr= to existing URL
        url = dbAirline.checkinUrl.includes('?')
          ? `${dbAirline.checkinUrl}&pnr=${encodeURIComponent(normalizedPnr)}`
          : `${dbAirline.checkinUrl}?pnr=${encodeURIComponent(normalizedPnr)}`
      }

      console.info(
        `[deep-linking] generateCheckinLink: ✅ ${dbAirline.airlineName} (${normalizedIata}) PNR=${maskPnr(normalizedPnr)} → ${url}`,
      )

      return {
        success: true,
        airline: dbAirline.airlineName,
        iataCode: normalizedIata,
        url,
        message: `✈️ Check-in en ligne disponible pour ${dbAirline.airlineName}`,
      }
    }

    // Compagnie trouvée mais inactive
    if (dbAirline && !dbAirline.isActive) {
      console.warn(
        `[deep-linking] generateCheckinLink: compagnie inactive "${dbAirline.airlineName}" (${normalizedIata})`,
      )
      return {
        success: false,
        airline: dbAirline.airlineName,
        iataCode: normalizedIata,
        url: null,
        message: `Le check-in en ligne pour ${dbAirline.airlineName} est temporairement indisponible.`,
      }
    }

    // Compagnie non trouvée en DB
    console.warn(
      `[deep-linking] generateCheckinLink: compagnie non trouvée pour IATA "${normalizedIata}"`,
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur DB inconnue'
    console.error(
      `[deep-linking] generateCheckinLink: ❌ erreur DB pour IATA "${normalizedIata}": ${msg}`,
    )
  }

  // 5. Fallback générique
  const genericUrl = `${GENERIC_CHECKIN_URL}?pnr=${encodeURIComponent(normalizedPnr)}&airline=${normalizedIata}`

  return {
    success: false,
    airline: null,
    iataCode: normalizedIata,
    url: genericUrl,
    message: `Compagnie "${normalizedIata}" non reconnue dans notre base. Vérifiez sur le site officiel de votre compagnie.`,
  }
}

/**
 * Récupère la liste de toutes les compagnies supportées avec leurs templates.
 * Utilisé par l'admin pour la gestion et le debug.
 */
export async function listSupportedAirlines(): Promise<
  Array<{ iataCode: string; airlineName: string; checkinUrl: string; isActive: boolean }>
> {
  try {
    const airlines = await db.checkinAirline.findMany({
      select: {
        iataCode: true,
        airlineName: true,
        checkinUrl: true,
        isActive: true,
      },
      orderBy: { airlineName: 'asc' },
    })
    return airlines
  } catch (error) {
    console.error('[deep-linking] listSupportedAirlines error:', error)
    return []
  }
}

// ─── Formatage WhatsApp ─────────────────────────────────────────────────────

/**
 * Formate un message WhatsApp complet avec le lien de check-in.
 *
 * FORMAT :
 * ━━━━━━━━━━━━━━━━
 * ✈️ CHECK-IN EN LIGNE
 * Bonjour [name],
 * Votre vol [airline] [flightNumber] est prêt pour le check-in.
 *
 * 📋 Réservation : [PNR masked]
 * 🛫 Départ : [departure] → [arrival]
 * 📅 Date : [date]
 *
 * 🔗 Effectuez votre check-in ici :
 * [checkinUrl]
 *
 * ━━━━━━━━━━━━━━━━
 * Répondez HELP pour de l'aide.
 */
export function formatWhatsAppMessage(params: WhatsAppCheckinParams): string {
  const {
    passengerName,
    airline,
    iataCode,
    flightNumber,
    pnr,
    checkinUrl,
    departureCode,
    arrivalCode,
    flightDate,
  } = params

  const lines: string[] = []

  // Header
  lines.push('━━━━━━━━━━━━━━━━')
  lines.push('✈️ *CHECK-IN EN LIGNE*')
  lines.push('')

  // Salutation
  const firstName = passengerName.trim().split(/\s+/)[0]
  lines.push(`Bonjour ${firstName},`)
  lines.push(`Votre vol *${airline} ${flightNumber}* est prêt pour le check-in.`)
  lines.push('')

  // Détails du vol
  lines.push('📋 *Réservation :* ' + maskPnr(pnr))

  if (departureCode && arrivalCode) {
    lines.push(`🛫 *Trajet :* ${departureCode} → ${arrivalCode}`)
  }

  if (flightDate) {
    lines.push(`📅 *Date :* ${flightDate}`)
  }

  lines.push('')

  // Lien de check-in
  lines.push('🔗 *Effectuez votre check-in ici :*')
  lines.push(checkinUrl)

  // Footer
  lines.push('')
  lines.push('━━━━━━━━━━━━━━━━')
  lines.push('Répondez *HELP* pour de l\'aide.')
  lines.push('_Service MAELLIS Smartly_')

  return lines.join('\n')
}

/**
 * Formate un message WhatsApp d'erreur quand le check-in échoue.
 */
export function formatWhatsAppErrorMessage(params: {
  iataCode: string
  pnr: string
  reason: string
}): string {
  const { iataCode, pnr, reason } = params

  const lines: string[] = [
    '━━━━━━━━━━━━━━━━',
    '⚠️ *CHECK-IN INDISPONIBLE*',
    '',
    `Nous n'avons pas pu générer votre lien de check-in.`,
    '',
    `📋 *Réservation :* ${maskPnr(pnr)}`,
    `🛫 *Compagnie :* ${iataCode}`,
    '',
    `❌ *Raison :* ${reason}`,
    '',
    'Veuillez effectuer votre check-in directement sur le site de votre compagnie aérienne.',
    '',
    '━━━━━━━━━━━━━━━━',
    'Répondez *HELP* pour de l\'aide.',
    '_Service MAELLIS Smartly_',
  ]

  return lines.join('\n')
}
