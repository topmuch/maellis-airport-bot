import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer'
import { COLORS, sharedStyles, formatCurrency, formatDate } from './templates'

// ─── Invoice PDF Data Interface ───────────────────────────────────────────

export interface InvoicePDFData {
  invoiceNumber: string
  issueDate: string
  dueDate: string
  clientName: string
  clientEmail: string
  clientPhone: string
  clientCompany?: string
  clientAddress?: string
  clientTaxId?: string
  type: string
  currency: string
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  notes?: string
  status: string
  legalName: string
  legalAddress: string
  legalTaxId?: string
  legalRccm?: string
  bankName?: string
  bankAccount?: string
}

// ─── Invoice-Specific Styles ──────────────────────────────────────────────

const invoiceStyles = StyleSheet.create({
  // Invoice info block
  infoBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoBox: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 8,
    color: COLORS.textLight,
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.dark,
    marginBottom: 6,
  },
  infoValueSmall: {
    fontSize: 9,
    color: COLORS.text,
  },

  // Status badge
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    textTransform: 'uppercase' as const,
  },

  // Client / Seller side by side
  partiesBlock: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  partyCard: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    backgroundColor: COLORS.lightGray,
  },
  partyTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  },
  partyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  partyDetail: {
    fontSize: 8,
    color: COLORS.textLight,
    marginBottom: 2,
  },

  // Items table
  itemsTable: {
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.dark,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  itemsHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    textTransform: 'uppercase' as const,
  },
  itemsRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
  },
  itemsRowAlt: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
    backgroundColor: COLORS.lightGray,
  },
  itemsCell: {
    fontSize: 9,
    color: COLORS.text,
  },
  itemsCellRight: {
    fontSize: 9,
    color: COLORS.text,
    textAlign: 'right' as const,
  },
  itemsCellBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.text,
    textAlign: 'right' as const,
  },

  // Totals section
  totalsBlock: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  totalsContainer: {
    width: 220,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
  },
  totalsRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.dark,
  },
  totalsLabel: {
    fontSize: 9,
    color: COLORS.text,
  },
  totalsLabelBold: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.dark,
  },
  totalsValue: {
    fontSize: 9,
    color: COLORS.text,
    textAlign: 'right' as const,
  },
  totalsValueBold: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    textAlign: 'right' as const,
  },

  // Legal mentions block
  legalBlock: {
    padding: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    marginBottom: 12,
  },
  legalTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.dark,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
  },
  legalText: {
    fontSize: 7,
    color: COLORS.textLight,
    marginBottom: 2,
  },

  // Payment info block
  paymentBlock: {
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    marginBottom: 12,
  },
  paymentTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.dark,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
  },
  paymentText: {
    fontSize: 8,
    color: COLORS.text,
    marginBottom: 2,
  },

  // Notes section
  notesBlock: {
    marginTop: 8,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 8,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },

  // Column widths for items table
  colDescription: '44%',
  colQuantity: '12%',
  colUnitPrice: '22%',
  colTotal: '22%',
})

// ─── Helper: Invoice status style ─────────────────────────────────────────

function getInvoiceStatusStyle(status: string): { bg: string } {
  switch (status.toLowerCase()) {
    case 'paid':
      return { bg: COLORS.successGreen }
    case 'overdue':
      return { bg: COLORS.errorRed }
    case 'partially_paid':
      return { bg: COLORS.warningAmber }
    case 'cancelled':
      return { bg: COLORS.textLight }
    case 'sent':
      return { bg: '#6366f1' }
    default:
      return { bg: '#6b7280' }
  }
}

function getInvoiceStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'Payée'
    case 'overdue':
      return 'En retard'
    case 'partially_paid':
      return 'Partiellement payée'
    case 'cancelled':
      return 'Annulée'
    case 'sent':
      return 'Envoyée'
    case 'draft':
      return 'Brouillon'
    default:
      return status
  }
}

function getInvoiceTypeLabel(type: string): string {
  switch (type.toLowerCase()) {
    case 'subscription':
      return 'Abonnement'
    case 'commission':
      return 'Commission'
    case 'marketplace':
      return 'Marketplace'
    case 'custom':
      return 'Personnalisée'
    default:
      return type
  }
}

// ─── InvoicePDF Component ─────────────────────────────────────────────────

export function InvoicePDF({ data }: { data: InvoicePDFData }) {
  const statusStyle = getInvoiceStatusStyle(data.status)

  return (
    <Document
      title={`Facture ${data.invoiceNumber}`}
      author="MAELLIS Technologies"
      subject={`Facture ${data.invoiceNumber} — ${data.clientName}`}
      creator="MAELLIS Billing Module"
    >
      <Page size="A4" style={sharedStyles.page}>
        {/* 1. Header bar (dark navy) with MAELLIS branding + FACTURE */}
        <View style={sharedStyles.headerBar}>
          <Text style={sharedStyles.headerBrand}>MAELLIS</Text>
          <Text style={sharedStyles.headerTitle}>FACTURE</Text>
          <Text style={sharedStyles.headerSubtext}>
            {getInvoiceTypeLabel(data.type)}
          </Text>
        </View>

        {/* 2. Orange accent line */}
        <View style={sharedStyles.headerOrangeAccent} />

        {/* 3. Invoice info block */}
        <View style={invoiceStyles.infoBlock}>
          <View style={invoiceStyles.infoBox}>
            <Text style={invoiceStyles.infoLabel}>Numéro de facture</Text>
            <Text style={invoiceStyles.infoValue}>{data.invoiceNumber}</Text>
            <Text style={invoiceStyles.infoLabel}>Date d&apos;émission</Text>
            <Text style={invoiceStyles.infoValueSmall}>{formatDate(data.issueDate)}</Text>
          </View>
          <View style={[invoiceStyles.infoBox, { alignItems: 'flex-end' }]}>
            <Text style={invoiceStyles.infoLabel}>Date d&apos;échéance</Text>
            <Text style={invoiceStyles.infoValueSmall}>{formatDate(data.dueDate)}</Text>
            <Text style={invoiceStyles.infoLabel}>Statut</Text>
            <View style={[invoiceStyles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={invoiceStyles.statusBadgeText}>
                {getInvoiceStatusLabel(data.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. Client info + Seller info side by side */}
        <View style={invoiceStyles.partiesBlock}>
          {/* Client block */}
          <View style={invoiceStyles.partyCard}>
            <Text style={invoiceStyles.partyTitle}>Client</Text>
            <Text style={invoiceStyles.partyName}>{data.clientName}</Text>
            {data.clientCompany && (
              <Text style={invoiceStyles.partyDetail}>{data.clientCompany}</Text>
            )}
            <Text style={invoiceStyles.partyDetail}>{data.clientEmail}</Text>
            <Text style={invoiceStyles.partyDetail}>{data.clientPhone}</Text>
            {data.clientAddress && (
              <Text style={invoiceStyles.partyDetail}>{data.clientAddress}</Text>
            )}
            {data.clientTaxId && (
              <Text style={invoiceStyles.partyDetail}>NINEA: {data.clientTaxId}</Text>
            )}
          </View>

          {/* Seller block */}
          <View style={invoiceStyles.partyCard}>
            <Text style={invoiceStyles.partyTitle}>Émetteur</Text>
            <Text style={invoiceStyles.partyName}>{data.legalName}</Text>
            <Text style={invoiceStyles.partyDetail}>{data.legalAddress}</Text>
            {data.legalTaxId && (
              <Text style={invoiceStyles.partyDetail}>NINEA: {data.legalTaxId}</Text>
            )}
            {data.legalRccm && (
              <Text style={invoiceStyles.partyDetail}>RCCM: {data.legalRccm}</Text>
            )}
          </View>
        </View>

        {/* 5. Items table */}
        <View style={invoiceStyles.itemsTable}>
          {/* Table header */}
          <View style={invoiceStyles.itemsHeaderRow}>
            <Text style={[invoiceStyles.itemsHeaderCell, { width: invoiceStyles.colDescription }]}>
              Description
            </Text>
            <Text style={[invoiceStyles.itemsHeaderCell, { width: invoiceStyles.colQuantity }]}>
              Qté
            </Text>
            <Text style={[invoiceStyles.itemsHeaderCell, { width: invoiceStyles.colUnitPrice, textAlign: 'right' }]}>
              Prix Unitaire
            </Text>
            <Text style={[invoiceStyles.itemsHeaderCell, { width: invoiceStyles.colTotal, textAlign: 'right' }]}>
              Total
            </Text>
          </View>

          {/* Table rows */}
          {data.items.map((item, idx) => {
            const rowStyle = idx % 2 === 0 ? invoiceStyles.itemsRow : invoiceStyles.itemsRowAlt
            return (
              <View key={`item-${idx}`} style={rowStyle}>
                <Text style={[invoiceStyles.itemsCell, { width: invoiceStyles.colDescription }]}>
                  {item.description}
                </Text>
                <Text style={[invoiceStyles.itemsCell, { width: invoiceStyles.colQuantity }]}>
                  {item.quantity}
                </Text>
                <Text style={[invoiceStyles.itemsCellRight, { width: invoiceStyles.colUnitPrice }]}>
                  {formatCurrency(item.unitPrice, data.currency)}
                </Text>
                <Text style={[invoiceStyles.itemsCellBold, { width: invoiceStyles.colTotal }]}>
                  {formatCurrency(item.total, data.currency)}
                </Text>
              </View>
            )
          })}
        </View>

        {/* 6. Totals section */}
        <View style={invoiceStyles.totalsBlock}>
          <View style={invoiceStyles.totalsContainer}>
            <View style={invoiceStyles.totalsRow}>
              <Text style={invoiceStyles.totalsLabel}>Sous-Total HT</Text>
              <Text style={invoiceStyles.totalsValue}>
                {formatCurrency(data.subtotal, data.currency)}
              </Text>
            </View>
            <View style={invoiceStyles.totalsRow}>
              <Text style={invoiceStyles.totalsLabel}>
                TVA ({Math.round(data.taxRate * 100)}%)
              </Text>
              <Text style={invoiceStyles.totalsValue}>
                {formatCurrency(data.taxAmount, data.currency)}
              </Text>
            </View>
            <View style={invoiceStyles.totalsRowFinal}>
              <Text style={invoiceStyles.totalsLabelBold}>Total TTC</Text>
              <Text style={invoiceStyles.totalsValueBold}>
                {formatCurrency(data.total, data.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* 7. Notes section */}
        {data.notes && (
          <View style={invoiceStyles.notesBlock}>
            <Text style={invoiceStyles.notesText}>Notes: {data.notes}</Text>
          </View>
        )}

        {/* 8. Legal mentions block */}
        <View style={invoiceStyles.legalBlock}>
          <Text style={invoiceStyles.legalTitle}>Mentions légales</Text>
          <Text style={invoiceStyles.legalText}>
            {data.legalName} — {data.legalAddress}
          </Text>
          {data.legalTaxId && (
            <Text style={invoiceStyles.legalText}>NINEA: {data.legalTaxId}</Text>
          )}
          {data.legalRccm && (
            <Text style={invoiceStyles.legalText}>RCCM: {data.legalRccm}</Text>
          )}
          <Text style={invoiceStyles.legalText}>
            Conformément aux dispositions du SYSCOHADA / OHADA
          </Text>
        </View>

        {/* 9. Payment info */}
        {(data.bankName || data.bankAccount) && (
          <View style={invoiceStyles.paymentBlock}>
            <Text style={invoiceStyles.paymentTitle}>Coordonnées bancaires</Text>
            {data.bankName && (
              <Text style={invoiceStyles.paymentText}>Banque: {data.bankName}</Text>
            )}
            {data.bankAccount && (
              <Text style={invoiceStyles.paymentText}>
                Compte: {data.bankAccount}
              </Text>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={sharedStyles.footer} fixed>
          <Text style={sharedStyles.footerText}>
            Document sans valeur fiscale si non payé — {data.legalName}
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
