import { renderToBuffer } from '@react-pdf/renderer'
import {
  RevenueReportPDF,
  ActivityReportPDF,
  type RevenueReportData,
  type ActivityReportData,
} from './templates'

/**
 * Generates a Revenue Report PDF buffer.
 *
 * @param data - Structured revenue report data
 * @returns PDF Buffer ready to send as HTTP response
 * @throws Error if PDF generation fails
 */
export async function generateRevenuePDF(data: RevenueReportData): Promise<Buffer> {
  try {
    const buffer = await renderToBuffer(<RevenueReportPDF data={data} />)
    return Buffer.from(buffer)
  } catch (error) {
    console.error('Error generating revenue PDF:', error)
    throw new Error(
      `Échec de la génération du PDF de revenus: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    )
  }
}

/**
 * Generates an Activity Report PDF buffer.
 *
 * @param data - Structured activity report data
 * @returns PDF Buffer ready to send as HTTP response
 * @throws Error if PDF generation fails
 */
export async function generateActivityPDF(data: ActivityReportData): Promise<Buffer> {
  try {
    const buffer = await renderToBuffer(<ActivityReportPDF data={data} />)
    return Buffer.from(buffer)
  } catch (error) {
    console.error('Error generating activity PDF:', error)
    throw new Error(
      `Échec de la génération du PDF d'activité: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    )
  }
}

/**
 * Generates a CSV string from revenue data.
 *
 * @param data - Structured revenue report data
 * @returns CSV string with BOM for Excel compatibility
 */
export function generateRevenueCSV(data: RevenueReportData): string {
  const BOM = '\uFEFF' // Byte Order Mark for Excel UTF-8
  const headers = ['Date', 'Référence', 'Téléphone', 'Fournisseur', 'Montant', 'Devise', 'Statut']
  const rows = data.payments.map((p) => [
    p.date,
    p.reference || '',
    p.phone,
    p.provider,
    p.amount.toString(),
    data.currency,
    p.status,
  ])

  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  const csvLines = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ]

  return BOM + csvLines.join('\n')
}

/**
 * Generates a CSV string from activity data.
 *
 * @param data - Structured activity report data
 * @returns CSV string with BOM for Excel compatibility
 */
export function generateActivityCSV(data: ActivityReportData): string {
  const BOM = '\uFEFF'

  // Summary section
  const lines: string[] = [
    'RAPPORT D\'ACTIVITÉ - ' + data.airportName,
    'Période,' + data.dateFrom + ' à ' + data.dateTo,
    '',
    'RÉSUMÉ',
    'Conversations,' + data.totalConversations,
    'Messages,' + data.totalMessages,
    'Conversations Résolues,' + data.resolvedConversations,
    'Taux de Résolution,' + data.resolutionRate.toFixed(1) + '%',
    'Temps de Réponse Moyen,' + data.averageResponseTime.toFixed(1) + 's',
    '',
    'RÉPARTITION DES LANGUES',
    'Langue,Messages,Pourcentage',
    ...data.languagesBreakdown.map((l) => `${l.language},${l.count},${l.percentage.toFixed(1)}%`),
    '',
    'INTENTIONS PRINCIPALES',
    'Intention,Nombre,Pourcentage',
    ...data.topIntents.map((i) => `${i.intent},${i.count},${i.percentage.toFixed(1)}%`),
  ]

  return BOM + lines.join('\n')
}
