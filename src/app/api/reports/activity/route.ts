import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  generateActivityPDF,
  generateActivityCSV,
} from '@/lib/pdf/generator'
import type { ActivityReportData } from '@/lib/pdf/templates'
import { requireRole } from '@/lib/auth'

const AIRPORT_NAMES: Record<string, string> = {
  DSS: 'Aéroport International Blaise Diagne',
  CKY: 'Aéroport International de Conakry',
  ABJ: 'Aéroport Félix Houphouët-Boigny',
  LOS: 'Aéroport International Murtala Muhammed',
  CMN: 'Aéroport Mohammed V',
  ACC: 'Aéroport International Kotoka',
  BKO: 'Aéroport International Modibo Keita',
  OUA: 'Aéroport International de Ouagadougou',
}

function getAirportName(code: string): string {
  return AIRPORT_NAMES[code.toUpperCase()] || `Aéroport ${code.toUpperCase()}`
}

// French labels for common intents
const INTENT_LABELS: Record<string, string> = {
  greeting: 'Salutations',
  flight_search: 'Recherche de Vols',
  flight_status: 'Statut de Vol',
  baggage: 'Bagages / QR',
  transport: 'Transport / Taxi',
  payment: 'Paiement',
  lounge: 'Salon VIP',
  emergency: 'Urgences / SOS',
  help: 'Aide',
  lost_item: 'Objets Perdus',
  information: 'Informations Générales',
  unknown: 'Non Identifié',
}

function getIntentLabel(intent: string | null): string {
  if (!intent) return INTENT_LABELS.unknown
  return INTENT_LABELS[intent] || intent
}

const LANGUAGE_LABELS: Record<string, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
  wo: 'Wolof',
}

function getLanguageLabel(code: string): string {
  return LANGUAGE_LABELS[code.toLowerCase()] || code.toUpperCase()
}

// GET /api/reports/activity?airportCode=DSS&from=2025-01-01&to=2025-06-30&format=pdf
export async function GET(request: NextRequest) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const airportCode = searchParams.get('airportCode') || 'DSS'
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const format = searchParams.get('format') || 'pdf'

    // Validate date range
    if (!from || !to) {
      return NextResponse.json(
        { error: 'Les paramètres from et to sont requis (format: YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    const dateFrom = new Date(from)
    const dateTo = new Date(to)

    if (isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime())) {
      return NextResponse.json(
        { error: 'Format de date invalide. Utilisez YYYY-MM-DD.' },
        { status: 400 }
      )
    }

    if (dateFrom > dateTo) {
      return NextResponse.json(
        { error: 'La date de début doit être antérieure à la date de fin.' },
        { status: 400 }
      )
    }

    const whereClause = {
      createdAt: {
        gte: dateFrom,
        lte: new Date(dateTo.getTime() + 24 * 60 * 60 * 1000 - 1),
      },
    }

    // Fetch conversations and messages in parallel
    const [conversations, messages] = await Promise.all([
      db.conversation.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      }),
      db.message.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // Calculate summary stats
    const resolvedConversations = conversations.filter((c) => c.resolved).length
    const totalConversations = conversations.length
    const totalMessages = messages.length
    const resolutionRate =
      totalConversations > 0
        ? (resolvedConversations / totalConversations) * 100
        : 0

    // Calculate average response time (in seconds) from bot messages
    const botMessages = messages.filter(
      (m) => m.direction === 'outbound' && m.responseTime != null
    )
    const averageResponseTime =
      botMessages.length > 0
        ? botMessages.reduce((sum, m) => sum + (m.responseTime ?? 0), 0) / botMessages.length / 1000
        : 0

    // Languages breakdown
    const languageCounts: Record<string, number> = {}
    conversations.forEach((c) => {
      const lang = c.language || 'fr'
      languageCounts[lang] = (languageCounts[lang] || 0) + 1
    })
    const languagesBreakdown = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([lang, count]) => ({
        language: getLanguageLabel(lang),
        count,
        percentage:
          totalConversations > 0 ? (count / totalConversations) * 100 : 0,
      }))

    // Top intents
    const intentCounts: Record<string, number> = {}
    conversations.forEach((c) => {
      const intent = getIntentLabel(c.intent)
      intentCounts[intent] = (intentCounts[intent] || 0) + 1
    })
    const topIntents = Object.entries(intentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([intent, count]) => ({
        intent,
        count,
        percentage:
          totalConversations > 0 ? (count / totalConversations) * 100 : 0,
      }))

    // Build report data
    const reportData: ActivityReportData = {
      airportCode: airportCode.toUpperCase(),
      airportName: getAirportName(airportCode),
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      generatedAt: new Date().toISOString(),
      totalConversations,
      totalMessages,
      resolvedConversations,
      resolutionRate,
      averageResponseTime,
      languagesBreakdown,
      topIntents,
    }

    // Return based on format
    if (format === 'csv') {
      const csv = generateActivityCSV(reportData)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="rapport-activite-${airportCode}-${from}-${to}.csv"`,
        },
      })
    }

    // Default: PDF
    const pdfBuffer = await generateActivityPDF(reportData)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rapport-activite-${airportCode}-${from}-${to}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error generating activity report:', error)
    return NextResponse.json(
      {
        error: "Erreur lors de la génération du rapport d'activité.",
        details: 'Internal error',
      },
      { status: 500 }
    )
  }
}
