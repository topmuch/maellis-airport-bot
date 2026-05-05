import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  generateRevenuePDF,
  generateRevenueCSV,
} from '@/lib/pdf/generator'
import type { RevenueReportData } from '@/lib/pdf/templates'
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

// GET /api/reports/revenue?airportCode=DSS&from=2025-01-01&to=2025-06-30&format=pdf
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

    // Fetch payment data from database
    const whereClause = {
      createdAt: {
        gte: dateFrom,
        lte: new Date(dateTo.getTime() + 24 * 60 * 60 * 1000 - 1), // End of day
      },
    }

    const [payments, aggregateResult] = await Promise.all([
      db.payment.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      }),
      db.payment.aggregate({
        where: { ...whereClause, status: 'completed' },
        _sum: { amount: true },
      }),
    ])

    const completedPayments = payments.filter(
      (p) => p.status === 'completed' || p.status === 'success'
    )

    // Calculate provider distribution to find top provider
    const providerCounts: Record<string, number> = {}
    payments.forEach((p) => {
      providerCounts[p.provider] = (providerCounts[p.provider] || 0) + 1
    })
    const topProvider =
      Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

    // Build report data
    const reportData: RevenueReportData = {
      airportCode: airportCode.toUpperCase(),
      airportName: getAirportName(airportCode),
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      generatedAt: new Date().toISOString(),
      totalRevenue: aggregateResult._sum.amount ?? 0,
      completedPayments: completedPayments.length,
      totalPayments: payments.length,
      averageTransaction:
        completedPayments.length > 0
          ? completedPayments.reduce((sum, p) => sum + p.amount, 0) / completedPayments.length
          : 0,
      topProvider,
      currency: 'XOF',
      payments: payments.map((p) => ({
        date: p.createdAt.toISOString(),
        reference: p.externalRef || p.id.slice(0, 8).toUpperCase(),
        phone: p.phone,
        provider: p.provider,
        amount: p.amount,
        status: p.status,
      })),
    }

    // Return based on format
    if (format === 'csv') {
      const csv = generateRevenueCSV(reportData)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="rapport-revenus-${airportCode}-${from}-${to}.csv"`,
        },
      })
    }

    // Default: PDF
    const pdfBuffer = await generateRevenuePDF(reportData)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rapport-revenus-${airportCode}-${from}-${to}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error generating revenue report:', error)
    return NextResponse.json(
      {
        error:
          'Erreur lors de la génération du rapport de revenus.',
        details: 'Internal error',
      },
      { status: 500 }
    )
  }
}
