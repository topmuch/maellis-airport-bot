import { db } from '@/lib/db'
import { z } from 'zod'

// ═══════════════════════════════════════════════════════════════
// MAELLIS Billing Module — Service Layer
// Clients, Invoices, Payments, Reminders, Settings, PDF, CSV
// ═══════════════════════════════════════════════════════════════

// ─── Zod Validation Schemas ──────────────────────────────────────────────

const getClientsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
})

const invoiceStatusEnum = z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled', 'partial'])
const invoiceTypeEnum = z.enum(['standard', 'recurring'])
const yyyyMmddRegex = /^\d{4}-\d{2}-\d{2}$/
const dateSchema = z.string().regex(yyyyMmddRegex, 'Must be a valid date in YYYY-MM-DD format')

const getInvoicesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  clientId: z.string().optional(),
  status: invoiceStatusEnum.optional(),
  type: invoiceTypeEnum.optional(),
  dateFrom: dateSchema.optional(),
  dateTo: dateSchema.optional(),
})

const iso4217Regex = /^[A-Z]{3}$/

const createInvoiceSchema = z.object({
  clientId: z.string().min(1, 'clientId is required'),
  type: invoiceTypeEnum,
  items: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().positive('Item quantity must be positive'),
    unitPrice: z.number().min(0, 'Item unit price must be non-negative'),
  })).min(1, 'At least one item is required'),
  issueDate: z.union([z.string(), z.date()]).optional(),
  dueDate: z.union([z.string(), z.date()]).optional(),
  notes: z.string().max(2000).optional(),
  currency: z.string().regex(iso4217Regex, 'Currency must be a valid ISO 4217 code (3 uppercase letters)').optional(),
})

const updateBillingSettingsSchema = z.object({
  defaultTaxRate: z.number().min(0).max(100, 'defaultTaxRate must be between 0 and 100').optional(),
  gracePeriodDays: z.coerce.number().int().min(1, 'gracePeriodDays must be a positive integer').optional(),
  reminderDays: z.coerce.number().int().min(1, 'reminderDays must be a positive integer').optional(),
  legalName: z.string().max(200).optional(),
  legalAddress: z.string().max(500).optional(),
  legalTaxId: z.string().max(50).optional(),
  legalRccm: z.string().max(50).optional(),
  bankName: z.string().max(200).optional(),
  bankAccount: z.string().max(100).optional(),
  paymentLink: z.string().max(500).optional(),
})

// ─────────────────────────────────────────────
// Validation Helpers
// ─────────────────────────────────────────────

/** Validate a positive finite number (must be > 0) */
function validatePositive(value: unknown, fieldName: string): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${fieldName} must be a positive number`)
  }
  return n
}

/** Validate a non-negative finite number (must be >= 0) */
function validateNonNegative(value: unknown, fieldName: string): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${fieldName} must be a non-negative number`)
  }
  return n
}

/** Safe string with max length — returns empty string for non-string input */
function sanitizeText(text: unknown, maxLength: number, fieldName: string): string {
  if (typeof text !== 'string') return ''
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    throw new Error(`${fieldName} is required`)
  }
  return trimmed.slice(0, maxLength)
}

/** Wrap error to prevent internal details from leaking */
function safeError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[billing.service] ${context}:`, message)
  if (error instanceof Error) {
    return new Error(error.message.includes('Prisma') ? 'Database error' : error.message)
  }
  return new Error('An unexpected error occurred')
}

/** Validate phone format */
function validatePhone(phone: unknown, fieldName = 'phone'): string {
  if (typeof phone !== 'string' || !/^[+\d\s\-()]{6,20}$/.test(phone.trim())) {
    throw new Error(`Invalid ${fieldName}: must be 6-20 characters and contain only digits, spaces, +, -, ()`)
  }
  return phone.trim()
}

/** Validate email format */
function validateEmail(email: unknown, fieldName = 'email'): string {
  if (typeof email !== 'string' || email.trim().length === 0) {
    throw new Error(`${fieldName} is required and must be a non-empty string`)
  }
  const trimmed = email.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error(`Invalid ${fieldName} format`)
  }
  return trimmed
}

/** Escape CSV field to prevent CSV injection */
function escapeCSV(value: unknown): string {
  const str = typeof value === 'string' ? value : String(value ?? '')
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str
  }
  return str
}

// ─────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────

export interface GetClientsParams {
  search?: string
  page: number
  limit: number
}

export interface CreateClientParams {
  name: string
  email: string
  phone: string
  company?: string
  taxId?: string
  address?: string
  currency?: string
  taxRate?: number
}

export interface GetInvoicesParams {
  clientId?: string
  status?: string
  type?: string
  dateFrom?: string
  dateTo?: string
  page: number
  limit: number
}

export interface CreateInvoiceParams {
  clientId: string
  type: string
  items: { description: string; quantity: number; unitPrice: number }[]
  issueDate?: Date
  dueDate?: Date
  notes?: string
  currency?: string
}

export interface RecordPaymentParams {
  amount: number
  method: string
  transactionId?: string
  metadata?: unknown
}

export interface PDFResult {
  buffer: Buffer
  invoiceNumber: string
}

export interface InvoiceWebhookResult {
  success: boolean
  message: string
  invoiceNumber?: string
  status?: string
}

export interface ReminderResult {
  sent: number
  failed: number
  reminders: unknown[]
}

export interface OverdueResult {
  count: number
  invoices: unknown[]
}

// ─────────────────────────────────────────────
// 1. CLIENTS
// ─────────────────────────────────────────────

export async function getClients(params: GetClientsParams) {
  try {
    // Zod validation
    const parsed = getClientsSchema.safeParse(params)
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`)
    }
    const { search, page, limit } = parsed.data
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { company: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    const [clients, total] = await Promise.all([
      db.billingClient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { invoices: true },
          },
        },
      }),
      db.billingClient.count({ where }),
    ])

    return {
      data: clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    throw safeError(error, 'getClients')
  }
}

export async function createClient(params: CreateClientParams) {
  try {
    // Validate inputs
    const name = sanitizeText(params.name, 200, 'name')
    const email = validateEmail(params.email, 'email')
    const phone = validatePhone(params.phone, 'phone')
    const company = params.company ? sanitizeText(params.company, 200, 'company') : null
    const taxId = params.taxId ? sanitizeText(params.taxId, 50, 'taxId') : null

    return await db.billingClient.create({
      data: {
        name,
        email,
        phone,
        company,
        taxId,
        address: params.address || '{}',
        currency: params.currency || 'XOF',
        taxRate: params.taxRate !== undefined ? validateNonNegative(params.taxRate, 'taxRate') : 0.18,
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.startsWith('Invalid ') || error.message.includes('is required') || error.message.includes('format'))) {
      throw error
    }
    throw safeError(error, 'createClient')
  }
}

// ─────────────────────────────────────────────
// 2. INVOICES
// ─────────────────────────────────────────────

export async function getInvoices(params: GetInvoicesParams) {
  try {
    // Zod validation
    const parsed = getInvoicesSchema.safeParse(params)
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`)
    }
    const { clientId, status, type, dateFrom, dateTo, page, limit } = parsed.data
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (clientId) where.clientId = clientId
    if (status) where.status = status
    if (type) where.type = type

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, unknown> = {}
      if (dateFrom) dateFilter.gte = new Date(dateFrom)
      if (dateTo) dateFilter.lte = new Date(dateTo)
      where.issueDate = dateFilter
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              company: true,
            },
          },
          _count: {
            select: {
              invoicePayments: true,
              reminders: true,
            },
          },
        },
      }),
      db.invoice.count({ where }),
    ])

    // Compute aggregate stats
    const summary = await db.invoice.aggregate({
      where,
      _sum: { total: true },
      _count: true,
    })

    return {
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalInvoices: summary._count,
        totalAmount: summary._sum.total ?? 0,
      },
    }
  } catch (error) {
    throw safeError(error, 'getInvoices')
  }
}

export async function createInvoice(params: CreateInvoiceParams) {
  try {
    // Zod validation for top-level fields (type, currency, dates)
    const createInvoicePartialSchema = createInvoiceSchema.pick({
      clientId: true, type: true, notes: true, currency: true,
      issueDate: true, dueDate: true,
    })
    const parsed = createInvoicePartialSchema.safeParse(params)
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`)
    }
    const { clientId, type, items, issueDate, dueDate, notes, currency } = params

    // Validate items
    for (const item of items) {
      if (typeof item.description !== 'string' || item.description.trim().length === 0) {
        throw new Error('Item description is required')
      }
      if (item.description.length > 500) {
        throw new Error('Item description must be at most 500 characters')
      }
      validatePositive(item.quantity, 'Item quantity')
      validateNonNegative(item.unitPrice, 'Item unit price')
    }

    // Validate notes length
    const safeNotes = notes ? sanitizeText(notes, 2000, 'notes') : null

    // Fetch client to get taxRate and currency
    const client = await db.billingClient.findUnique({ where: { id: clientId } })
    if (!client) {
      throw new Error('Client not found')
    }

    const invoiceCurrency = currency || client.currency
    const taxRate = client.taxRate

    // Compute subtotal
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const taxAmount = subtotal * taxRate
    const total = subtotal + taxAmount

    // Generate invoice number: FAC-YYYY-NNNN
    const year = new Date().getFullYear()
    const settings = await db.billingSettings.findUnique({ where: { id: 'global' } })
    const nextNum = (settings?.nextInvoiceNum || 1)
    const invoiceNumber = `FAC-${year}-${String(nextNum).padStart(4, '0')}`

    // Compute due date (default 30 days from issue date)
    const invoiceIssueDate = issueDate || new Date()
    const invoiceDueDate = dueDate || new Date(invoiceIssueDate.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Create invoice with items in a transaction
    const invoice = await db.$transaction(async (tx) => {
      // Create the invoice
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          clientId,
          type,
          status: 'draft',
          issueDate: invoiceIssueDate,
          dueDate: invoiceDueDate,
          currency: invoiceCurrency,
          subtotal,
          taxRate,
          taxAmount,
          total,
          notes: notes || null,
        },
      })

      // Create invoice items
      await tx.invoiceItem.createMany({
        data: items.map((item) => ({
          invoiceId: newInvoice.id,
          description: item.description.trim().slice(0, 500),
          quantity: Math.round(validatePositive(item.quantity, 'quantity') * 100) / 100,
          unitPrice: Math.round(validateNonNegative(item.unitPrice, 'unit price') * 100) / 100,
          total: Math.round(item.quantity * item.unitPrice * 100) / 100,
        })),
      })

      // Increment next invoice number
      if (settings) {
        await tx.billingSettings.update({
          where: { id: 'global' },
          data: { nextInvoiceNum: nextNum + 1 },
        })
      } else {
        await tx.billingSettings.create({
          data: { id: 'global', nextInvoiceNum: nextNum + 1 },
        })
      }

      // Return with items
      return tx.invoice.findUnique({
        where: { id: newInvoice.id },
        include: {
          items: true,
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              company: true,
            },
          },
        },
      })
    })

    return invoice
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Item') || error.message.includes('is required') || error.message.includes('at most') || error.message.includes('must be'))) {
      throw error
    }
    throw safeError(error, 'createInvoice')
  }
}

// ─────────────────────────────────────────────
// 3. MARK AS SENT
// ─────────────────────────────────────────────

export async function markAsSent(invoiceId: string) {
  try {
    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } })
    if (!invoice) {
      throw new Error('Invoice not found')
    }

    if (invoice.status !== 'draft' && invoice.status !== 'sent') {
      throw new Error(`Cannot send invoice with status "${invoice.status}". Only draft or sent invoices can be sent.`)
    }

    const updated = await db.invoice.update({
      where: { id: invoiceId },
      data: { status: 'sent' },
      include: {
        client: true,
        items: true,
      },
    })

    // Fire-and-forget email notification
    if (updated.client?.email) {
      import('@/lib/services/email.service').then(({ sendInvoiceEmail }) => {
        sendInvoiceEmail(updated.client.email, {
          clientName: updated.client.name,
          invoiceNumber: updated.invoiceNumber,
          amount: updated.total,
          currency: updated.currency,
          dueDate: updated.dueDate.toISOString(),
        }).catch((emailError) => {
          console.error('[billing.service] Failed to send invoice email:', emailError)
        })
      }).catch(() => {
        // Silently ignore if email service is unavailable
      })
    }

    return updated
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Invoice') || error.message.startsWith('Cannot'))) {
      throw error
    }
    throw safeError(error, 'markAsSent')
  }
}

// ─────────────────────────────────────────────
// 4. RECORD PAYMENT
// ─────────────────────────────────────────────

export async function recordPayment(invoiceId: string, params: RecordPaymentParams) {
  try {
    // Validate payment amount
    const safeAmount = validatePositive(params.amount, 'Payment amount')

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        invoicePayments: {
          where: { status: 'completed' },
        },
      },
    })

    if (!invoice) {
      throw new Error('Invoice not found')
    }

    // Check if already paid
    if (invoice.status === 'paid') {
      throw new Error('Invoice is already fully paid')
    }

    if (invoice.status === 'cancelled') {
      throw new Error('Cannot record payment for a cancelled invoice')
    }

    // Calculate remaining amount
    const totalPaid = invoice.invoicePayments.reduce((sum, p) => sum + p.amount, 0)
    const remaining = invoice.total - totalPaid

    if (safeAmount > remaining + 0.01) {
      throw new Error(
        `Payment amount (${safeAmount}) exceeds remaining balance (${remaining.toFixed(2)}). Invoice would be overpaid.`
      )
    }

    // Create payment record in transaction
    const result = await db.$transaction(async (tx) => {
      // Create InvoicePayment
      const payment = await tx.invoicePayment.create({
        data: {
          invoiceId,
          amount: safeAmount,
          method: params.method,
          transactionId: params.transactionId || null,
          status: 'completed',
          paidAt: new Date(),
          metadata: params.metadata ? JSON.stringify(params.metadata) : '{}',
        },
      })

      // Recalculate total paid
      const newTotalPaid = totalPaid + safeAmount

      // Determine new status
      let newStatus: string
      let paidAt: Date | null = null

      if (newTotalPaid >= invoice.total - 0.01) {
        // Fully paid (allow tiny rounding differences)
        newStatus = 'paid'
        paidAt = new Date()
      } else {
        newStatus = 'partially_paid'
      }

      // Update invoice
      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: newStatus,
          paidAt,
        },
        include: {
          client: true,
          items: true,
          invoicePayments: {
            orderBy: { paidAt: 'desc' },
          },
        },
      })

      return { payment, invoice: updated }
    })

    return result
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.startsWith('Invoice') || error.message.startsWith('Cannot') || error.message.includes('exceeds'))) {
      throw error
    }
    throw safeError(error, 'recordPayment')
  }
}

// ─────────────────────────────────────────────
// 5. GENERATE INVOICE PDF
// ─────────────────────────────────────────────

export async function generateInvoicePDF(invoiceId: string): Promise<PDFResult | null> {
  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: { orderBy: { id: 'asc' } },
        client: true,
        invoicePayments: { orderBy: { paidAt: 'desc' } },
      },
    })

    if (!invoice) {
      return null
    }

    const settings = await db.billingSettings.findUnique({ where: { id: 'global' } })

    // Parse client address from JSON
    let clientAddress = ''
    try {
      const addr = JSON.parse(invoice.client.address || '{}')
      const parts = [addr.street, addr.city, addr.country].filter(Boolean)
      clientAddress = parts.join(', ')
    } catch {
      clientAddress = invoice.client.address || ''
    }

    // Build PDF data for @react-pdf/renderer template
    const pdfData = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate instanceof Date
        ? invoice.issueDate.toISOString().slice(0, 10)
        : String(invoice.issueDate),
      dueDate: invoice.dueDate instanceof Date
        ? invoice.dueDate.toISOString().slice(0, 10)
        : String(invoice.dueDate),
      clientName: invoice.client.name,
      clientEmail: invoice.client.email,
      clientPhone: invoice.client.phone,
      clientCompany: invoice.client.company || undefined,
      clientAddress: clientAddress || undefined,
      clientTaxId: invoice.client.taxId || undefined,
      type: invoice.type,
      currency: invoice.currency,
      status: invoice.status,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      notes: invoice.notes || undefined,
      legalName: settings?.legalName || 'MAELLIS Technologies',
      legalAddress: settings?.legalAddress || 'Dakar, Sénégal',
      legalTaxId: settings?.legalTaxId || undefined,
      legalRccm: settings?.legalRccm || undefined,
      bankName: settings?.bankName || undefined,
      bankAccount: settings?.bankAccount || undefined,
    }

    // Generate real PDF using @react-pdf/renderer (dynamic import to avoid server crash)
    const { generateInvoicePDFBuffer } = await import('@/lib/pdf/generator')
    const buffer = await generateInvoicePDFBuffer(pdfData)

    return {
      buffer,
      invoiceNumber: invoice.invoiceNumber,
    }
  } catch (error) {
    throw safeError(error, 'generateInvoicePDF')
  }
}

// ─────────────────────────────────────────────
// 6. GENERATE INVOICE CSV
// ─────────────────────────────────────────────

export function generateInvoiceCSV(invoices: unknown[]): string {
  const header = 'Numéro,Client,Société,Type,Statut,Date émission,Date échéance,Sous-total,TVA,Total,Devise'
  const rows = (invoices as Record<string, unknown>[]).map((inv) => {
    const client = inv.client as Record<string, unknown> | undefined
    const clientName = escapeCSV(client?.name || '')
    const company = escapeCSV(client?.company || '')
    const invoiceNumber = escapeCSV(inv.invoiceNumber || '')
    const type = escapeCSV(inv.type || '')
    const status = escapeCSV(inv.status || '')
    const issueDate = inv.issueDate instanceof Date
      ? inv.issueDate.toISOString().slice(0, 10)
      : String(inv.issueDate || '')
    const dueDate = inv.dueDate instanceof Date
      ? inv.dueDate.toISOString().slice(0, 10)
      : String(inv.dueDate || '')
    const subtotal = inv.subtotal || 0
    const taxAmount = inv.taxAmount || 0
    const total = inv.total || 0
    const currency = escapeCSV(inv.currency || 'XOF')

    return `"${invoiceNumber}","${clientName}","${company}","${type}","${status}","${issueDate}","${dueDate}",${subtotal},${taxAmount},${total},"${currency}"`
  })

  return header + '\n' + rows.join('\n')
}

// ─────────────────────────────────────────────
// 7. BILLING STATS
// ─────────────────────────────────────────────

export async function getBillingStats() {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Parallel queries for dashboard stats
    const [
      totalInvoices,
      totalClients,
      overdueInvoices,
      monthlyRevenue,
      lastMonthRevenue,
      paidInvoices,
      draftInvoices,
      sentInvoices,
      recentInvoices,
    ] = await Promise.all([
      // Total invoices
      db.invoice.count(),

      // Total active clients
      db.billingClient.count({ where: { isActive: true } }),

      // Overdue invoices
      db.invoice.count({
        where: {
          status: 'overdue',
        },
      }),

      // This month revenue (paid invoices)
      db.invoice.aggregate({
        where: {
          status: 'paid',
          paidAt: { gte: startOfMonth },
        },
        _sum: { total: true },
      }),

      // Last month revenue
      db.invoice.aggregate({
        where: {
          status: 'paid',
          paidAt: {
            gte: startOfLastMonth,
            lte: endOfLastMonth,
          },
        },
        _sum: { total: true },
      }),

      // Paid invoices count
      db.invoice.count({ where: { status: 'paid' } }),

      // Draft invoices count
      db.invoice.count({ where: { status: 'draft' } }),

      // Sent invoices count
      db.invoice.count({ where: { status: 'sent' } }),

      // Recent invoices (last 5)
      db.invoice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          client: {
            select: { name: true, company: true },
          },
        },
      }),
    ])

    const currentRevenue = monthlyRevenue._sum.total ?? 0
    const lastRevenue = lastMonthRevenue._sum.total ?? 0
    const revenueGrowth = lastRevenue > 0
      ? ((currentRevenue - lastRevenue) / lastRevenue) * 100
      : 0

    // Outstanding amount (sent + partially_paid + overdue)
    const outstandingResult = await db.invoice.aggregate({
      where: {
        status: { in: ['sent', 'partially_paid', 'overdue'] },
      },
      _sum: { total: true },
    })

    return {
      overview: {
        totalInvoices,
        totalClients,
        overdueInvoices,
        outstandingAmount: outstandingResult._sum.total ?? 0,
        currentMonthRevenue: currentRevenue,
        lastMonthRevenue: lastRevenue,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      },
      byStatus: {
        paid: paidInvoices,
        draft: draftInvoices,
        sent: sentInvoices,
        overdue: overdueInvoices,
      },
      recentInvoices,
    }
  } catch (error) {
    throw safeError(error, 'getBillingStats')
  }
}

// ─────────────────────────────────────────────
// 8. BILLING SETTINGS
// ─────────────────────────────────────────────

export async function getBillingSettings() {
  try {
    let settings = await db.billingSettings.findUnique({ where: { id: 'global' } })

    if (!settings) {
      // Create default settings
      settings = await db.billingSettings.create({ data: { id: 'global' } })
    }

    return settings
  } catch (error) {
    throw safeError(error, 'getBillingSettings')
  }
}

export async function updateBillingSettings(data: Record<string, unknown>) {
  try {
    // Zod validation
    const parsed = updateBillingSettingsSchema.safeParse(data)
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`)
    }

    const settings = await getBillingSettings()

    // Build update data — only update provided fields (already validated by Zod)
    const updateData: Record<string, unknown> = {}

    for (const [field, value] of Object.entries(parsed.data)) {
      if (value !== undefined) {
        updateData[field] = value
      }
    }

    return await db.billingSettings.update({
      where: { id: settings.id },
      data: updateData,
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Validation failed')) {
      throw error
    }
    throw safeError(error, 'updateBillingSettings')
  }
}

// ─────────────────────────────────────────────
// 9. CINETPAY INVOICE WEBHOOK
// ─────────────────────────────────────────────

export async function handleInvoicePaymentWebhook(
  body: Record<string, unknown>
): Promise<InvoiceWebhookResult> {
  try {
    const { cpm_trans_id, cpm_amount, cpm_trans_status, cpm_custom } = body as Record<string, string>

    if (!cpm_trans_id || !cpm_custom) {
      return {
        success: false,
        message: 'Missing required webhook fields (cpm_trans_id, cpm_custom)',
      }
    }

    // Find the invoice payment by transaction ID
    const payment = await db.invoicePayment.findUnique({
      where: { transactionId: cpm_trans_id },
      include: { invoice: true },
    })

    if (!payment) {
      return {
        success: false,
        message: `No invoice payment found for transaction ${cpm_trans_id}`,
      }
    }

    const isSuccess = ['ACCEPTED', 'COMPLETED'].includes((cpm_trans_status || '').toUpperCase())

    if (isSuccess) {
      // Update payment status
      await db.invoicePayment.update({
        where: { id: payment.id },
        data: { status: 'completed', paidAt: new Date() },
      })

      // Recalculate invoice total paid
      const allPayments = await db.invoicePayment.findMany({
        where: {
          invoiceId: payment.invoiceId,
          status: 'completed',
        },
      })

      const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0)

      if (totalPaid >= payment.invoice.total - 0.01) {
        await db.invoice.update({
          where: { id: payment.invoiceId },
          data: { status: 'paid', paidAt: new Date() },
        })
      } else {
        await db.invoice.update({
          where: { id: payment.invoiceId },
          data: { status: 'partially_paid' },
        })
      }

      return {
        success: true,
        message: `Payment confirmed for invoice ${payment.invoice.invoiceNumber}`,
        invoiceNumber: payment.invoice.invoiceNumber,
        status: 'paid',
      }
    } else {
      await db.invoicePayment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      })

      return {
        success: false,
        message: `Payment failed (${cpm_trans_status}) for invoice ${payment.invoice.invoiceNumber}`,
        invoiceNumber: payment.invoice.invoiceNumber,
        status: 'failed',
      }
    }
  } catch (error) {
    throw safeError(error, 'handleInvoicePaymentWebhook')
  }
}

// ─────────────────────────────────────────────
// 10. REMINDERS & OVERDUE CHECKS
// ─────────────────────────────────────────────

export async function checkOverdueInvoices(): Promise<OverdueResult> {
  try {
    const settings = await getBillingSettings()
    const gracePeriodDays = settings.gracePeriodDays || 3

    const now = new Date()
    const cutoffDate = new Date(now.getTime() - gracePeriodDays * 24 * 60 * 60 * 1000)

    // Find sent/partially_paid invoices past due date + grace period
    const overdueInvoices = await db.invoice.findMany({
      where: {
        status: { in: ['sent', 'partially_paid'] },
        dueDate: { lt: cutoffDate },
      },
    })

    // Mark them as overdue
    const updated = await Promise.all(
      overdueInvoices.map((inv) =>
        db.invoice.update({
          where: { id: inv.id },
          data: { status: 'overdue' },
        })
      )
    )

    return {
      count: updated.length,
      invoices: updated,
    }
  } catch (error) {
    throw safeError(error, 'checkOverdueInvoices')
  }
}

export async function processReminders(): Promise<ReminderResult> {
  try {
    const settings = await getBillingSettings()
    const reminderDays: number[] = JSON.parse(settings.reminderDays || '[3,7,15]')

    // First, check overdue
    await checkOverdueInvoices()

    // Get all overdue invoices
    const overdueInvoices = await db.invoice.findMany({
      where: {
        status: 'overdue',
      },
      include: {
        client: true,
        reminders: {
          orderBy: { sentAt: 'desc' },
        },
      },
    })

    let sent = 0
    let failed = 0
    const processed: unknown[] = []

    for (const invoice of overdueInvoices) {
      // Calculate days overdue
      const daysOverdue = Math.floor(
        (Date.now() - invoice.dueDate.getTime()) / (24 * 60 * 60 * 1000)
      )

      // Check if we should send a reminder based on configured days
      const existingDays = invoice.reminders.map((r) => r.daysOverdue)
      const shouldSend = reminderDays.some(
        (days) => daysOverdue >= days && !existingDays.includes(days)
      )

      if (!shouldSend) {
        continue
      }

      try {
        // Create reminder record
        const reminder = await db.invoiceReminder.create({
          data: {
            invoiceId: invoice.id,
            type: invoice.client.email ? 'email' : 'whatsapp',
            daysOverdue,
            status: 'sent',
            metadata: JSON.stringify({ method: 'auto' }),
          },
        })

        // Fire-and-forget email/whatsapp notification
        if (invoice.client.email) {
          import('@/lib/services/email.service').then(({ sendOverdueReminder }) => {
            sendOverdueReminder(invoice.client.email, {
              clientName: invoice.client.name,
              invoiceNumber: invoice.invoiceNumber,
              total: invoice.total,
              currency: invoice.currency,
              daysOverdue,
            }).catch((err) => {
              console.error('[billing.service] Failed to send overdue email:', err)
            })
          }).catch(() => {})
        }

        sent++
        processed.push(reminder)
      } catch (reminderError) {
        failed++
        processed.push({ error: String(reminderError), invoiceId: invoice.id })
      }
    }

    return { sent, failed, reminders: processed }
  } catch (error) {
    throw safeError(error, 'processReminders')
  }
}
