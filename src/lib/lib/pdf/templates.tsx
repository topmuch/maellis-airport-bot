import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

// ─── Color Constants ──────────────────────────────────────────────────────────
const COLORS = {
  primary: '#f97316',
  dark: '#1e3a8a',
  text: '#1f2937',
  textLight: '#6b7280',
  accent: '#f97316',
  background: '#ffffff',
  lightGray: '#f9fafb',
  borderGray: '#e5e7eb',
  successGreen: '#059669',
  warningAmber: '#d97706',
  errorRed: '#dc2626',
  white: '#ffffff',
  lightOrange: '#fff7ed',
  lightNavy: '#eff6ff',
}

// ─── Type Definitions ─────────────────────────────────────────────────────────

export interface RevenueReportData {
  airportCode: string
  airportName: string
  dateFrom: string
  dateTo: string
  generatedAt: string
  totalRevenue: number
  completedPayments: number
  totalPayments: number
  averageTransaction: number
  topProvider: string
  currency: string
  payments: Array<{
    date: string
    reference: string
    phone: string
    provider: string
    amount: number
    status: string
  }>
}

export interface ActivityReportData {
  airportCode: string
  airportName: string
  dateFrom: string
  dateTo: string
  generatedAt: string
  totalConversations: number
  totalMessages: number
  resolvedConversations: number
  resolutionRate: number
  averageResponseTime: number
  languagesBreakdown: Array<{ language: string; count: number; percentage: number }>
  topIntents: Array<{ intent: string; count: number; percentage: number }>
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const sharedStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  headerBar: {
    backgroundColor: COLORS.dark,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  headerOrangeAccent: {
    height: 4,
    backgroundColor: COLORS.primary,
  },
  headerBrand: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginTop: 8,
  },
  headerSubtext: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 2,
  },
  headerDateRange: {
    fontSize: 9,
    color: '#cbd5e1',
    marginTop: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderGray,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: COLORS.textLight,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.dark,
    marginBottom: 10,
    marginTop: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  summaryCard: {
    flex: 1,
    minWidth: 130,
    padding: 14,
    borderRadius: 6,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  summaryCardLabel: {
    fontSize: 8,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    marginBottom: 4,
    fontFamily: 'Helvetica',
  },
  summaryCardValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.dark,
  },
  summaryCardAccent: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },
  tableContainer: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.dark,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
    backgroundColor: COLORS.lightGray,
  },
  tableCell: {
    fontSize: 9,
    color: COLORS.text,
  },
  tableCellRight: {
    fontSize: 9,
    color: COLORS.text,
    textAlign: 'right' as const,
  },
  tableCellStatus: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
  },
  chartPlaceholder: {
    borderWidth: 2,
    borderColor: COLORS.borderGray,
    borderStyle: 'dashed',
    borderRadius: 6,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: COLORS.lightGray,
  },
  chartPlaceholderText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontFamily: 'Helvetica-Bold',
  },
  chartPlaceholderSubtext: {
    fontSize: 8,
    color: COLORS.textLight,
    marginTop: 4,
  },
  languageBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
  },
  languageLabel: {
    fontSize: 9,
    width: 60,
    color: COLORS.text,
  },
  languageBarOuter: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.borderGray,
    borderRadius: 4,
    marginHorizontal: 8,
  },
  languageBarInner: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  languageCount: {
    fontSize: 8,
    color: COLORS.textLight,
    width: 40,
    textAlign: 'right' as const,
  },
  languagePercent: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.dark,
    width: 40,
    textAlign: 'right' as const,
  },
})

// Helper to format currency
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency === 'XOF' ? 'XOF' : currency,
    maximumFractionDigits: 0,
  }).format(amount).replace('XOF', 'FCFA')
}

// Helper to format date
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// Helper to get status style
function getStatusStyle(status: string): { bg: string; color: string } {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'succès':
    case 'success':
      return { bg: COLORS.successGreen, color: COLORS.white }
    case 'pending':
    case 'en attente':
      return { bg: COLORS.warningAmber, color: COLORS.white }
    case 'failed':
    case 'échoué':
      return { bg: COLORS.errorRed, color: COLORS.white }
    case 'processing':
    case 'traitement':
      return { bg: COLORS.dark, color: COLORS.white }
    default:
      return { bg: COLORS.textLight, color: COLORS.white }
  }
}

// Helper to get status French label
function getStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'success':
      return 'Succès'
    case 'pending':
      return 'En attente'
    case 'failed':
      return 'Échoué'
    case 'processing':
      return 'Traitement'
    default:
      return status
  }
}

// ─── Revenue Report PDF ───────────────────────────────────────────────────────

export function RevenueReportPDF({ data }: { data: RevenueReportData }) {
  const statusStyle = (status: string) => {
    const s = getStatusStyle(status)
    return StyleSheet.create({
      container: {
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 3,
        backgroundColor: s.bg,
      },
      text: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: s.color,
      },
    })
  }

  // Column widths for the revenue table (total = 100%)
  const colWidths = ['15%', '18%', '16%', '16%', '18%', '17%']

  return (
    <Document
      title={`Rapport de Revenus - ${data.airportName}`}
      author="MAELLIS Airport Bot"
      subject="Rapport Financier"
      creator="MAELLIS Airport Bot"
    >
      {/* Page 1 — Summary */}
      <Page size="A4" style={sharedStyles.page}>
        {/* Header */}
        <View style={sharedStyles.headerBar}>
          <Text style={sharedStyles.headerBrand}>MAELLIS</Text>
          <Text style={sharedStyles.headerTitle}>Rapport de Revenus</Text>
          <Text style={sharedStyles.headerSubtext}>
            {data.airportName} ({data.airportCode})
          </Text>
          <Text style={sharedStyles.headerDateRange}>
            Période : {formatDate(data.dateFrom)} — {formatDate(data.dateTo)}
          </Text>
        </View>
        <View style={sharedStyles.headerOrangeAccent} />

        {/* Summary Section */}
        <Text style={sharedStyles.sectionTitle}>Résumé Financier</Text>
        <View style={sharedStyles.summaryGrid}>
          <View style={sharedStyles.summaryCard}>
            <Text style={sharedStyles.summaryCardLabel}>Revenu Total</Text>
            <Text style={sharedStyles.summaryCardAccent}>
              {formatCurrency(data.totalRevenue, data.currency)}
            </Text>
          </View>
          <View style={sharedStyles.summaryCard}>
            <Text style={sharedStyles.summaryCardLabel}>Paiements Complétés</Text>
            <Text style={sharedStyles.summaryCardValue}>
              {data.completedPayments} / {data.totalPayments}
            </Text>
          </View>
          <View style={sharedStyles.summaryCard}>
            <Text style={sharedStyles.summaryCardLabel}>Transaction Moyenne</Text>
            <Text style={sharedStyles.summaryCardValue}>
              {formatCurrency(data.averageTransaction, data.currency)}
            </Text>
          </View>
          <View style={sharedStyles.summaryCard}>
            <Text style={sharedStyles.summaryCardLabel}>Fournisseur Principal</Text>
            <Text style={sharedStyles.summaryCardAccent}>
              {data.topProvider}
            </Text>
          </View>
        </View>

        {/* Payments Table */}
        <Text style={sharedStyles.sectionTitle}>Détail des Transactions</Text>
        <View style={sharedStyles.tableContainer}>
          {/* Table Header */}
          <View style={sharedStyles.tableHeaderRow}>
            {['Date', 'Référence', 'Téléphone', 'Fournisseur', 'Montant', 'Statut'].map(
              (title, i) => (
                <Text key={title} style={[sharedStyles.tableHeaderCell, { width: colWidths[i] }]}>
                  {title}
                </Text>
              )
            )}
          </View>

          {/* Table Rows */}
          {data.payments.map((payment, idx) => {
            const rowStyle = idx % 2 === 0 ? sharedStyles.tableRow : sharedStyles.tableRowAlt
            const status = statusStyle(payment.status)
            return (
              <View key={payment.reference} style={rowStyle}>
                <Text style={[sharedStyles.tableCell, { width: colWidths[0] }]}>
                  {formatDate(payment.date)}
                </Text>
                <Text style={[sharedStyles.tableCell, { width: colWidths[1] }]}>
                  {payment.reference || '—'}
                </Text>
                <Text style={[sharedStyles.tableCell, { width: colWidths[2] }]}>
                  {payment.phone}
                </Text>
                <Text style={[sharedStyles.tableCell, { width: colWidths[3] }]}>
                  {payment.provider}
                </Text>
                <Text style={[sharedStyles.tableCellRight, { width: colWidths[4] }]}>
                  {formatCurrency(payment.amount, data.currency)}
                </Text>
                <View style={{ width: colWidths[5] }}>
                  <View style={status.container}>
                    <Text style={status.text}>
                      {getStatusLabel(payment.status)}
                    </Text>
                  </View>
                </View>
              </View>
            )
          })}
        </View>

        {/* Empty state */}
        {data.payments.length === 0 && (
          <View style={sharedStyles.chartPlaceholder}>
            <Text style={sharedStyles.chartPlaceholderText}>
              Aucune transaction pour cette période
            </Text>
            <Text style={sharedStyles.chartPlaceholderSubtext}>
              Ajustez la plage de dates pour voir les résultats
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={sharedStyles.footer} fixed>
          <Text style={sharedStyles.footerText}>
            Généré par MAELLIS Airport Bot — {formatDate(data.generatedAt)}
          </Text>
          <Text
            style={sharedStyles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}

// ─── Activity Report PDF ──────────────────────────────────────────────────────

export function ActivityReportPDF({ data }: { data: ActivityReportData }) {
  // Column widths for intents table
  const intentColWidths = ['15%', '55%', '15%', '15%']

  return (
    <Document
      title={`Rapport d'Activité - ${data.airportName}`}
      author="MAELLIS Airport Bot"
      subject="Rapport Opérationnel"
      creator="MAELLIS Airport Bot"
    >
      {/* Page 1 — Summary */}
      <Page size="A4" style={sharedStyles.page}>
        {/* Header */}
        <View style={sharedStyles.headerBar}>
          <Text style={sharedStyles.headerBrand}>MAELLIS</Text>
          <Text style={sharedStyles.headerTitle}>Rapport d&apos;Activité</Text>
          <Text style={sharedStyles.headerSubtext}>
            {data.airportName} ({data.airportCode})
          </Text>
          <Text style={sharedStyles.headerDateRange}>
            Période : {formatDate(data.dateFrom)} — {formatDate(data.dateTo)}
          </Text>
        </View>
        <View style={sharedStyles.headerOrangeAccent} />

        {/* Summary Section */}
        <Text style={sharedStyles.sectionTitle}>Résumé de l&apos;Activité</Text>
        <View style={sharedStyles.summaryGrid}>
          <View style={sharedStyles.summaryCard}>
            <Text style={sharedStyles.summaryCardLabel}>Conversations</Text>
            <Text style={sharedStyles.summaryCardAccent}>
              {data.totalConversations}
            </Text>
          </View>
          <View style={sharedStyles.summaryCard}>
            <Text style={sharedStyles.summaryCardLabel}>Messages</Text>
            <Text style={sharedStyles.summaryCardValue}>
              {data.totalMessages}
            </Text>
          </View>
          <View style={sharedStyles.summaryCard}>
            <Text style={sharedStyles.summaryCardLabel}>Taux de Résolution</Text>
            <Text style={sharedStyles.summaryCardAccent}>
              {data.resolutionRate.toFixed(1)}%
            </Text>
          </View>
          <View style={sharedStyles.summaryCard}>
            <Text style={sharedStyles.summaryCardLabel}>Temps Réponse Moy.</Text>
            <Text style={sharedStyles.summaryCardValue}>
              {data.averageResponseTime.toFixed(1)}s
            </Text>
          </View>
        </View>

        {/* Languages Breakdown */}
        <Text style={sharedStyles.sectionTitle}>Répartition des Langues</Text>
        <View
          style={[
            sharedStyles.tableContainer,
            { borderWidth: 1, borderColor: COLORS.borderGray, borderRadius: 4 },
          ]}
        >
          <View style={sharedStyles.tableHeaderRow}>
            <Text style={[sharedStyles.tableHeaderCell, { width: '25%' }]}>
              Langue
            </Text>
            <Text style={[sharedStyles.tableHeaderCell, { width: '35%' }]}>
              Barre
            </Text>
            <Text style={[sharedStyles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>
              Messages
            </Text>
            <Text style={[sharedStyles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>
              Pourcentage
            </Text>
          </View>

          {data.languagesBreakdown.map((lang, idx) => {
            const rowStyle = idx % 2 === 0 ? sharedStyles.tableRow : sharedStyles.tableRowAlt
            return (
              <View key={lang.language} style={rowStyle}>
                <Text style={[sharedStyles.tableCell, { width: '25%' }]}>
                  {lang.language}
                </Text>
                <View style={{ width: '35%', flexDirection: 'row', alignItems: 'center' }}>
                  <View style={sharedStyles.languageBarOuter}>
                    <View
                      style={[
                        sharedStyles.languageBarInner,
                        { width: `${Math.min(lang.percentage, 100)}%` },
                      ]}
                    />
                  </View>
                </View>
                <Text style={[sharedStyles.tableCell, { width: '20%', textAlign: 'right' }]}>
                  {lang.count}
                </Text>
                <Text style={[sharedStyles.tableCell, { width: '20%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>
                  {lang.percentage.toFixed(1)}%
                </Text>
              </View>
            )
          })}
        </View>

        {/* Chart Placeholder */}
        <Text style={sharedStyles.sectionTitle}>Évolution du Trafic</Text>
        <View style={sharedStyles.chartPlaceholder}>
          <Text style={sharedStyles.chartPlaceholderText}>Graphique</Text>
          <Text style={sharedStyles.chartPlaceholderSubtext}>
            Visualisation graphique disponible dans le tableau de bord en ligne
          </Text>
        </View>

        {/* Footer */}
        <View style={sharedStyles.footer} fixed>
          <Text style={sharedStyles.footerText}>
            Généré par MAELLIS Airport Bot — {formatDate(data.generatedAt)}
          </Text>
          <Text
            style={sharedStyles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* Page 2 — Top Intents */}
      <Page size="A4" style={sharedStyles.page}>
        {/* Header (simplified for page 2) */}
        <View style={sharedStyles.headerBar}>
          <Text style={sharedStyles.headerBrand}>MAELLIS</Text>
          <Text style={sharedStyles.headerTitle}>Rapport d&apos;Activité (suite)</Text>
          <Text style={sharedStyles.headerSubtext}>
            {data.airportName} ({data.airportCode})
          </Text>
        </View>
        <View style={sharedStyles.headerOrangeAccent} />

        {/* Top Intents Table */}
        <Text style={sharedStyles.sectionTitle}>Intentions Principales</Text>
        <View style={sharedStyles.tableContainer}>
          {/* Table Header */}
          <View style={sharedStyles.tableHeaderRow}>
            <Text style={[sharedStyles.tableHeaderCell, { width: intentColWidths[0] }]}>
              #
            </Text>
            <Text style={[sharedStyles.tableHeaderCell, { width: intentColWidths[1] }]}>
              Intention
            </Text>
            <Text style={[sharedStyles.tableHeaderCell, { width: intentColWidths[2], textAlign: 'right' }]}>
              Nombre
            </Text>
            <Text style={[sharedStyles.tableHeaderCell, { width: intentColWidths[3], textAlign: 'right' }]}>
              Pourcentage
            </Text>
          </View>

          {/* Table Rows */}
          {data.topIntents.map((item, idx) => {
            const rowStyle = idx % 2 === 0 ? sharedStyles.tableRow : sharedStyles.tableRowAlt
            return (
              <View key={item.intent} style={rowStyle}>
                <Text style={[sharedStyles.tableCell, { width: intentColWidths[0], fontFamily: 'Helvetica-Bold' }]}>
                  {idx + 1}
                </Text>
                <Text style={[sharedStyles.tableCell, { width: intentColWidths[1] }]}>
                  {item.intent}
                </Text>
                <Text style={[sharedStyles.tableCell, { width: intentColWidths[2], textAlign: 'right' }]}>
                  {item.count}
                </Text>
                <Text style={[sharedStyles.tableCell, { width: intentColWidths[3], textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>
                  {item.percentage.toFixed(1)}%
                </Text>
              </View>
            )
          })}
        </View>

        {/* Chart Placeholder for intents */}
        <Text style={sharedStyles.sectionTitle}>Distribution des Intentions</Text>
        <View style={sharedStyles.chartPlaceholder}>
          <Text style={sharedStyles.chartPlaceholderText}>Graphique</Text>
          <Text style={sharedStyles.chartPlaceholderSubtext}>
            Répartition visuelle des intentions dans le tableau de bord en ligne
          </Text>
        </View>

        {/* Resolution Stats Detail */}
        <Text style={sharedStyles.sectionTitle}>Détail des Résolutions</Text>
        <View style={sharedStyles.summaryGrid}>
          <View style={sharedStyles.summaryCard}>
            <Text style={sharedStyles.summaryCardLabel}>Conversations Résolues</Text>
            <Text style={sharedStyles.summaryCardAccent}>
              {data.resolvedConversations}
            </Text>
          </View>
          <View style={sharedStyles.summaryCard}>
            <Text style={sharedStyles.summaryCardLabel}>Non Résolues</Text>
            <Text style={[sharedStyles.summaryCardValue, { color: COLORS.warningAmber }]}>
              {data.totalConversations - data.resolvedConversations}
            </Text>
          </View>
          <View style={sharedStyles.summaryCard}>
            <Text style={sharedStyles.summaryCardLabel}>Messages / Conversation</Text>
            <Text style={sharedStyles.summaryCardValue}>
              {data.totalConversations > 0
                ? (data.totalMessages / data.totalConversations).toFixed(1)
                : '0'}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={sharedStyles.footer} fixed>
          <Text style={sharedStyles.footerText}>
            Généré par MAELLIS Airport Bot — {formatDate(data.generatedAt)}
          </Text>
          <Text
            style={sharedStyles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}

// ─── Export helper functions ──────────────────────────────────────────────────
// These are re-exported for use in generator.ts

export { COLORS, sharedStyles, formatCurrency, formatDate, getStatusStyle, getStatusLabel }
