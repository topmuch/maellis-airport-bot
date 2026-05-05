'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Receipt,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Eye,
  Download,
  Plus,
  FileText,
  Send,
  Banknote,
  XCircle,
  Trash2,
  Loader2,
  Bell,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

// ── Types ───────────────────────────────────────────────────────────────────

interface Invoice {
  id: string
  invoiceNumber: string
  clientId: string
  client: { id: string; name: string; email: string; phone: string; company?: string }
  type: string
  status: string
  issueDate: string
  dueDate: string
  paidAt: string | null
  currency: string
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  pdfUrl: string | null
  notes: string | null
  items: InvoiceItem[]
  invoicePayments: InvoicePayment[]
  reminders: InvoiceReminder[]
  createdAt: string
  updatedAt: string
}

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

interface InvoicePayment {
  id: string
  amount: number
  method: string
  transactionId: string | null
  status: string
  paidAt: string
}

interface InvoiceReminder {
  id: string
  type: string
  sentAt: string
  daysOverdue: number
  status: string
}

interface BillingClient {
  id: string
  name: string
  email: string
  phone: string
  company?: string
  taxId?: string
  isActive: boolean
}

interface BillingStatsOverview {
  totalInvoices: number
  totalClients: number
  overdueInvoices: number
  outstandingAmount: number
  currentMonthRevenue: number
  lastMonthRevenue: number
  revenueGrowth: number
}

interface BillingStatsByStatus {
  paid: number
  draft: number
  sent: number
  overdue: number
}

interface BillingStats {
  overview: BillingStatsOverview
  byStatus: BillingStatsByStatus
  recentInvoices: Invoice[]
}

interface NewInvoiceItem {
  description: string
  quantity: number
  unitPrice: number
}

// ── Format Helpers ──────────────────────────────────────────────────────────

function formatXOF(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA'
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

// ── Constants ───────────────────────────────────────────────────────────────

const TAX_RATE = 18 // 18% TVA

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  subscription: {
    label: 'Abonnement',
    className: 'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100',
  },
  commission: {
    label: 'Commission',
    className: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100',
  },
  marketplace: {
    label: 'Marketplace',
    className: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100',
  },
  custom: {
    label: 'Sur Mesure',
    className: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100',
  },
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: {
    label: 'Brouillon',
    className: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100',
  },
  sent: {
    label: 'Envoyée',
    className: 'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100',
  },
  partially_paid: {
    label: 'Partiellement Payée',
    className: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100',
  },
  paid: {
    label: 'Payée',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  },
  overdue: {
    label: 'En Retard',
    className: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100',
  },
  cancelled: {
    label: 'Annulée',
    className: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100',
  },
}

const METHOD_LABELS: Record<string, string> = {
  cinetpay: 'CinetPay',
  bank_transfer: 'Virement Bancaire',
  cash: 'Cash',
}

// ── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status]
  if (config) {
    return <Badge className={config.className}>{config.label}</Badge>
  }
  return <Badge variant="secondary">{status}</Badge>
}

// ── Type Badge ──────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const config = TYPE_CONFIG[type]
  if (config) {
    return <Badge className={config.className}>{config.label}</Badge>
  }
  return <Badge variant="secondary">{type}</Badge>
}

// ── Stats Card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
  colorClass: string
  iconBgClass: string
  loading?: boolean
}

function StatCard({ title, value, icon, colorClass, iconBgClass, loading }: StatCardProps) {
  return (
    <Card className={`border-l-4 ${colorClass.replace('text-', 'border-l-')} overflow-hidden`}>
      <CardContent className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBgClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-7 w-28" />
          ) : (
            <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Create Invoice Dialog ──────────────────────────────────────────────────

function CreateInvoiceDialog({
  open,
  onOpenChange,
  clients,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: BillingClient[]
  onSubmit: (data: {
    clientId: string
    type: string
    items: NewInvoiceItem[]
    issueDate: string
    dueDate: string
    notes: string
  }) => void
  submitting: boolean
}) {
  const [clientId, setClientId] = useState('')
  const [type, setType] = useState('subscription')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<NewInvoiceItem[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ])

  const updateItem = (index: number, field: keyof NewInvoiceItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const addItem = () => {
    setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const taxAmount = subtotal * (TAX_RATE / 100)
  const total = subtotal + taxAmount

  const handleSubmit = () => {
    if (!clientId) {
      toast.error('Veuillez sélectionner un client')
      return
    }
    const validItems = items.filter((i) => i.description.trim() && i.unitPrice > 0)
    if (validItems.length === 0) {
      toast.error('Ajoutez au moins un article valide')
      return
    }
    onSubmit({
      clientId,
      type,
      items: validItems,
      issueDate,
      dueDate,
      notes,
    })
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setClientId('')
      setType('subscription')
      setIssueDate(new Date().toISOString().split('T')[0])
      setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      setNotes('')
      setItems([{ description: '', quantity: 1, unitPrice: 0 }])
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-orange-500" />
            Nouvelle Facture
          </DialogTitle>
          <DialogDescription>
            Créez une nouvelle facture pour un client
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client & Type Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients
                    .filter((c) => c.isActive)
                    .map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company
                          ? `${client.company} — ${client.name}`
                          : client.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type de facture</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscription">Abonnement</SelectItem>
                  <SelectItem value="commission">Commission</SelectItem>
                  <SelectItem value="marketplace">Marketplace</SelectItem>
                  <SelectItem value="custom">Sur Mesure</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date d&apos;émission</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date d&apos;échéance</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Articles</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="size-3.5" />
                Ajouter
              </Button>
            </div>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Description</TableHead>
                    <TableHead className="w-24 text-center">Qté</TableHead>
                    <TableHead className="w-32 text-right">Prix Unitaire</TableHead>
                    <TableHead className="w-28 text-right">Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          placeholder="Description..."
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, 'quantity', parseInt(e.target.value) || 0)
                          }
                          className="h-8 text-sm text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(index, 'unitPrice', parseInt(e.target.value) || 0)
                          }
                          className="h-8 text-sm text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatXOF(item.quantity * item.unitPrice)}
                      </TableCell>
                      <TableCell>
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-red-500"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2 rounded-lg border bg-muted/30 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total (HT)</span>
                <span className="font-medium">{formatXOF(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TVA ({TAX_RATE}%)</span>
                <span className="font-medium">{formatXOF(taxAmount)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold">Total TTC</span>
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {formatXOF(total)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Notes ou conditions particulières..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button
            className="bg-orange-600 hover:bg-orange-700 text-white"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? 'Création...' : 'Créer la Facture'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Record Payment Dialog ──────────────────────────────────────────────────

function RecordPaymentDialog({
  open,
  onOpenChange,
  remainingBalance,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  remainingBalance: number
  onSubmit: (data: { amount: number; method: string; transactionId: string }) => void
  submitting: boolean
}) {
  const [amount, setAmount] = useState(remainingBalance.toString())
  const [method, setMethod] = useState('cinetpay')
  const [transactionId, setTransactionId] = useState('')

  const handleSubmit = () => {
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) {
      toast.error('Le montant doit être supérieur à 0')
      return
    }
    if (numAmount > remainingBalance) {
      toast.error('Le montant dépasse le solde restant')
      return
    }
    onSubmit({
      amount: numAmount,
      method,
      transactionId: transactionId.trim(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="size-5 text-emerald-500" />
            Enregistrer un Paiement
          </DialogTitle>
          <DialogDescription>
            Solde restant :{' '}
            <span className="font-semibold text-orange-600">
              {formatXOF(remainingBalance)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Montant *</Label>
            <Input
              type="number"
              min={0}
              step={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Méthode de paiement *</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cinetpay">CinetPay</SelectItem>
                <SelectItem value="bank_transfer">Virement Bancaire</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>ID Transaction</Label>
            <Input
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="Référence de transaction..."
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Invoice Detail Dialog ──────────────────────────────────────────────────

function InvoiceDetailDialog({
  open,
  onOpenChange,
  invoice,
  onAction,
  actionSubmitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: Invoice | null
  onAction: (action: string, invoiceId: string, payload?: Record<string, unknown>) => void
  actionSubmitting: boolean
}) {
  const [paymentOpen, setPaymentOpen] = useState(false)

  if (!invoice) return null

  const paidAmount = invoice.invoicePayments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = invoice.total - paidAmount

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-orange-500" />
              Facture {invoice.invoiceNumber}
            </DialogTitle>
            <DialogDescription>
              Détails de la facture
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status & Amount Header */}
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Statut :</span>
                <StatusBadge status={invoice.status} />
              </div>
              <div>
                <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {formatXOF(invoice.total)}
                </span>
              </div>
            </div>

            {/* Client Info */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Informations Client
              </h4>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Nom :</span>
                  <p className="font-medium">{invoice.client?.name ?? '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Société :</span>
                  <p className="font-medium">{invoice.client?.company ?? '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email :</span>
                  <p className="font-medium">{invoice.client?.email ?? '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Téléphone :</span>
                  <p className="font-medium">{invoice.client?.phone ?? '—'}</p>
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Détails
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <span className="text-muted-foreground">Type :</span>
                  <p><TypeBadge type={invoice.type} /></p>
                </div>
                <div>
                  <span className="text-muted-foreground">Émission :</span>
                  <p className="font-medium">{formatDate(invoice.issueDate)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Échéance :</span>
                  <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Devise :</span>
                  <p className="font-medium">{invoice.currency}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Articles
              </h4>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Qté</TableHead>
                      <TableHead className="text-right">Prix Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatXOF(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatXOF(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-2 rounded-lg border bg-orange-50/50 p-4 dark:bg-orange-950/20">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total (HT)</span>
                  <span className="font-medium">{formatXOF(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    TVA ({invoice.taxRate}%)
                  </span>
                  <span className="font-medium">{formatXOF(invoice.taxAmount)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-semibold">Total TTC</span>
                  <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {formatXOF(invoice.total)}
                  </span>
                </div>
                {invoice.status === 'paid' && invoice.paidAt && (
                  <div className="border-t pt-2 flex justify-between text-sm">
                    <span className="text-emerald-600">Payé le</span>
                    <span className="font-medium text-emerald-600">
                      {formatDate(invoice.paidAt)}
                    </span>
                  </div>
                )}
                {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                  <>
                    <div className="border-t pt-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">Payé</span>
                      <span className="font-medium text-emerald-600">
                        -{formatXOF(paidAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-amber-600">Restant dû</span>
                      <span className="text-lg font-bold text-amber-600">
                        {formatXOF(remaining)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payment History */}
            {invoice.invoicePayments.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Historique des Paiements
                </h4>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead>Méthode</TableHead>
                        <TableHead>Transaction</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.invoicePayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="text-sm">
                            {formatDateTime(payment.paidAt)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-emerald-600">
                            {formatXOF(payment.amount)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {METHOD_LABELS[payment.method] ?? payment.method}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {payment.transactionId ?? '—'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                payment.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100'
                              }
                            >
                              {payment.status === 'completed' ? 'Complété' : payment.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Reminders Timeline */}
            {invoice.reminders.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Rappels Envoyés
                </h4>
                <div className="space-y-3">
                  {invoice.reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                        <Bell className="size-3.5 text-amber-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium capitalize">
                            {reminder.type === 'first'
                              ? '1er Rappel'
                              : reminder.type === 'second'
                                ? '2ème Rappel'
                                : reminder.type === 'final'
                                  ? 'Dernier Rappel'
                                  : reminder.type}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs"
                          >
                            J+{reminder.daysOverdue}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Envoyé le {formatDateTime(reminder.sentAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Notes
                </h4>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="text-xs text-muted-foreground border-t pt-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span>Créée le : </span>
                  <span>{formatDateTime(invoice.createdAt)}</span>
                </div>
                <div>
                  <span>Mise à jour : </span>
                  <span>{formatDateTime(invoice.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <DialogFooter className="flex-col gap-2 sm:flex-row flex-wrap">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>

            {invoice.status === 'draft' && (
              <Button
                className="bg-sky-600 hover:bg-sky-700 text-white"
                onClick={() => onAction('mark_sent', invoice.id)}
                disabled={actionSubmitting}
              >
                {actionSubmitting && <Loader2 className="size-4 animate-spin" />}
                <Send className="size-4" />
                Marquer Envoyée
              </Button>
            )}

            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setPaymentOpen(true)}
              >
                <Banknote className="size-4" />
                Enregistrer Paiement
              </Button>
            )}

            {invoice.pdfUrl && (
              <Button variant="outline" onClick={() => onAction('download', invoice.id)}>
                <Download className="size-4" />
                Télécharger PDF
              </Button>
            )}

            {!invoice.pdfUrl && (
              <Button variant="outline" onClick={() => onAction('generate_pdf', invoice.id)}>
                <Download className="size-4" />
                Générer PDF
              </Button>
            )}

            {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => onAction('cancel', invoice.id)}
                disabled={actionSubmitting}
              >
                <XCircle className="size-4" />
                Annuler
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Sub-Dialog */}
      <RecordPaymentDialog
        key={paymentOpen ? 'open' : 'closed'}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        remainingBalance={remaining}
        onSubmit={(data) => {
          onAction('record_payment', invoice.id, data)
          setPaymentOpen(false)
        }}
        submitting={actionSubmitting}
      />
    </>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function InvoicesModule() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<BillingStats | null>(null)
  const [clients, setClients] = useState<BillingClient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [actionSubmitting, setActionSubmitting] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)

  // ── Data Fetching ───────────────────────────────────────────────────────

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const [invoicesResult, statsResult, clientsResult] = await Promise.all([
        apiClient.get('/api/invoices'),
        apiClient.get('/api/billing/stats'),
        apiClient.get('/api/clients'),
      ])

      if (invoicesResult.success) {
        const data = invoicesResult.data as { data?: { invoices?: Invoice[] } }
        setInvoices(data.data?.invoices ?? [])
      }

      if (statsResult.success) {
        setStats(statsResult.data as BillingStats)
      }

      if (clientsResult.success) {
        const data = clientsResult.data as { data?: BillingClient[] }
        setClients(data.data ?? [])
      }
    } catch {
      // Silently handle - empty state will display
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await fetchInvoices()
      if (cancelled) setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [fetchInvoices])

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleCreateInvoice = async (data: {
    clientId: string
    type: string
    items: NewInvoiceItem[]
    issueDate: string
    dueDate: string
    notes: string
  }) => {
    setCreateSubmitting(true)
    try {
      const result = await apiClient.post('/api/invoices', {
        ...data,
        taxRate: TAX_RATE,
        currency: 'XOF',
      })
      if (result.success) {
        toast.success('Facture créée avec succès')
        setCreateOpen(false)
        fetchInvoices()
        return
      }
      toast.error(result.error ?? 'Erreur lors de la création')
    } catch {
      toast.error('Erreur de connexion')
    }
    setCreateSubmitting(false)
  }

  const handleAction = async (
    action: string,
    invoiceId: string,
    payload?: Record<string, unknown>
  ) => {
    setActionSubmitting(true)
    try {
      if (action === 'record_payment') {
        const result = await apiClient.post(`/api/invoices/${invoiceId}/pay`, payload)
        if (result.success) {
          toast.success('Paiement enregistré avec succès')
          setDetailOpen(false)
          fetchInvoices()
          return
        }
        toast.error(result.error ?? 'Erreur lors de l\'enregistrement')
      } else if (action === 'mark_sent') {
        const result = await apiClient.patch(`/api/invoices/${invoiceId}`, { status: 'sent' })
        if (result.success) {
          toast.success('Facture marquée comme envoyée')
          setDetailOpen(false)
          fetchInvoices()
          return
        }
        toast.error(result.error ?? 'Erreur lors de la mise à jour')
      } else if (action === 'cancel') {
        const result = await apiClient.patch(`/api/invoices/${invoiceId}`, { status: 'cancelled' })
        if (result.success) {
          toast.success('Facture annulée')
          setDetailOpen(false)
          fetchInvoices()
          return
        }
        toast.error(result.error ?? 'Erreur lors de l\'annulation')
      } else if (action === 'download' || action === 'generate_pdf') {
        const res = await fetch(`/api/invoices/${invoiceId}/pdf`, {
          method: 'POST',
        })
        if (res.ok) {
          const blob = await res.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          const invoice = invoices.find((inv) => inv.id === invoiceId)
          a.download = `facture-${invoice?.invoiceNumber ?? invoiceId}.pdf`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)
          toast.success('PDF téléchargé')
          return
        }
        toast.error('Erreur lors du téléchargement du PDF')
      }
    } catch {
      toast.error('Erreur de connexion')
    }
    setActionSubmitting(false)
  }

  const handleExportCSV = () => {
    if (invoices.length === 0) {
      toast.error('Aucune facture à exporter')
      return
    }

    const headers = [
      'N° Facture',
      'Client',
      'Type',
      'Montant TTC',
      'Statut',
      'Date Émission',
      'Échéance',
    ]
    const rows = filteredInvoices.map((inv) => [
      inv.invoiceNumber,
      inv.client?.name ?? '',
      TYPE_CONFIG[inv.type]?.label ?? inv.type,
      inv.total.toString(),
      STATUS_CONFIG[inv.status]?.label ?? inv.status,
      inv.issueDate,
      inv.dueDate,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `factures_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    toast.success('CSV exporté avec succès')
  }

  const handleViewDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setDetailOpen(true)
  }

  // ── Computed ────────────────────────────────────────────────────────────

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.client?.name.toLowerCase().includes(q) ||
      inv.client?.company?.toLowerCase().includes(q) ||
      inv.client?.email.toLowerCase().includes(q)
    )
  })

  const computedStats: BillingStats = stats ?? {
    overview: {
      totalInvoices: invoices.length,
      totalClients: clients.length,
      overdueInvoices: invoices.filter((i) => i.status === 'overdue').length,
      outstandingAmount: invoices
        .filter((i) => i.status === 'sent' || i.status === 'overdue' || i.status === 'partially_paid')
        .reduce((sum, i) => {
          const paid = i.invoicePayments.reduce((s, p) => s + p.amount, 0)
          return sum + Math.max(0, i.total - paid)
        }, 0),
      currentMonthRevenue: invoices
        .filter((i) => i.status === 'paid' || i.status === 'partially_paid')
        .reduce((sum, i) => sum + i.total, 0),
      lastMonthRevenue: 0,
      revenueGrowth: 0,
    },
    byStatus: {
      paid: invoices.filter((i) => i.status === 'paid').length,
      draft: invoices.filter((i) => i.status === 'draft').length,
      sent: invoices.filter((i) => i.status === 'sent').length,
      overdue: invoices.filter((i) => i.status === 'overdue').length,
    },
    recentInvoices: invoices.slice(0, 5),
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Factures</h2>
          <p className="text-muted-foreground">
            Gestion des factures et suivi des paiements
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenu"
          value={formatXOF(computedStats.overview.currentMonthRevenue)}
          icon={<Receipt className="size-6 text-emerald-600 dark:text-emerald-400" />}
          colorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
          loading={loading}
        />
        <StatCard
          title="Factures Payées"
          value={computedStats.byStatus.paid.toString()}
          icon={<CheckCircle className="size-6 text-green-600 dark:text-green-400" />}
          colorClass="text-green-600 dark:text-green-400"
          iconBgClass="bg-green-100 dark:bg-green-900/30"
          loading={loading}
        />
        <StatCard
          title="En Attente"
          value={formatXOF(computedStats.overview.outstandingAmount)}
          icon={<Clock className="size-6 text-amber-600 dark:text-amber-400" />}
          colorClass="text-amber-600 dark:text-amber-400"
          iconBgClass="bg-amber-100 dark:bg-amber-900/30"
          loading={loading}
        />
        <StatCard
          title="En Retard"
          value={computedStats.overview.overdueInvoices.toString()}
          icon={<AlertTriangle className="size-6 text-red-600 dark:text-red-400" />}
          colorClass="text-red-600 dark:text-red-400"
          iconBgClass="bg-red-100 dark:bg-red-900/30"
          loading={loading}
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Liste des Factures</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:w-auto">
              <Button
                className="bg-orange-600 hover:bg-orange-700 text-white"
                size="sm"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" />
                Nouvelle Facture
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
              >
                <Download className="size-4" />
                Exporter CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="N° facture, client..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="sent">Envoyée</SelectItem>
                <SelectItem value="partially_paid">Partiellement Payée</SelectItem>
                <SelectItem value="paid">Payée</SelectItem>
                <SelectItem value="overdue">En Retard</SelectItem>
                <SelectItem value="cancelled">Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invoices Table */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="max-h-[480px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Facture</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Montant TTC</TableHead>
                    <TableHead>Émission</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        Aucune facture trouvée.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-xs font-medium">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {invoice.client?.company ?? invoice.client?.name ?? '—'}
                            </p>
                            {invoice.client?.company && (
                              <p className="text-xs text-muted-foreground">
                                {invoice.client.name}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TypeBadge type={invoice.type} />
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm">
                          {formatXOF(invoice.total)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(invoice.issueDate)}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          <span
                            className={
                              invoice.status === 'overdue'
                                ? 'text-red-600 font-medium'
                                : 'text-muted-foreground'
                            }
                          >
                            {formatDate(invoice.dueDate)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-8 text-orange-500 border-orange-200 hover:bg-orange-50"
                              onClick={() => handleViewDetail(invoice)}
                            >
                              <Eye className="size-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-orange-500"
                              onClick={() => handleAction('download', invoice.id)}
                            >
                              <Download className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        clients={clients}
        onSubmit={handleCreateInvoice}
        submitting={createSubmitting}
      />

      {/* Invoice Detail Dialog */}
      <InvoiceDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        invoice={selectedInvoice}
        onAction={handleAction}
        actionSubmitting={actionSubmitting}
      />
    </div>
  )
}
