import { db } from '@/lib/db'
import { getExternalConfig } from '@/lib/external-api-client'

// ═══════════════════════════════════════════════════════════════
// MAELLIS Payment Providers — Strategy Pattern
// Orange Money & Wave mobile money payment providers
// ═══════════════════════════════════════════════════════════════

// ─── Shared Types ──────────────────────────────────────────────

export interface PaymentProviderParams {
  orderNumber: string
  amount: number
  customerName: string
  customerPhone: string
  customerEmail?: string
  description: string
  currency?: string
  bookingType?: string
}

export interface PaymentProviderResult {
  success: boolean
  paymentUrl?: string
  paymentToken?: string
  externalRef?: string
  error?: string
}

export interface PaymentWebhookResult {
  success: boolean
  message: string
  orderNumber?: string
  status?: string
  provider?: string
}

export interface PaymentCheckResult {
  status: 'paid' | 'pending' | 'failed'
  amount: number
  provider: string
  timestamp: string | null
}

// ─── Internal Helpers ──────────────────────────────────────────

function validateAmount(amount: number): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid amount: ${amount}`)
  }
  return Math.round(amount * 100) / 100
}

function sanitizeText(value: string, field: string, max = 500): string {
  const trimmed = (value || '').trim()
  if (!trimmed) throw new Error(`${field} is required`)
  if (trimmed.length > max) throw new Error(`${field} must be at most ${max} characters`)
  return trimmed
}

function sanitizePhone(phone: string, field = 'phone'): string {
  const cleaned = (phone || '').trim()
  if (!cleaned || !/^[+\d\s\-()]{6,20}$/.test(cleaned)) {
    throw new Error(`Invalid ${field}`)
  }
  return cleaned
}

function safeError(error: unknown, context: string): Error {
  const msg = error instanceof Error ? error.message : String(error)
  console.error(`[payment.providers] ${context}:`, msg)
  return new Error(`Payment error: ${context}. Please try again.`)
}

/**
 * Store a Payment record in the DB for tracking.
 */
async function storePaymentRecord(data: {
  bookingId: string
  bookingType: string
  phone: string
  provider: string
  country: string
  currency: string
  amount: number
  externalRef?: string
  status?: string
}) {
  return db.payment.create({
    data: {
      id: crypto.randomUUID(),
      bookingId: data.bookingId,
      bookingType: data.bookingType || 'order',
      phone: data.phone,
      provider: data.provider,
      country: 'SN',
      currency: data.currency || 'XOF',
      amount: data.amount,
      status: data.status || 'pending',
      externalRef: data.externalRef ?? null,
      updatedAt: new Date(),
    },
  })
}

// ═══════════════════════════════════════════════════════════════
// 1. ORANGE MONEY PROVIDER (Senegal)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate an Orange Money payment URL.
 *
 * Uses Orange Money Web Payment API (Senegal):
 * 1. POST /orange-money-webpayment/senegal/v1/webpayment
 *    with Basic Auth (clientId:clientSecret)
 * 2. Returns a payment URL to redirect the customer
 *
 * Falls back to mock URL if credentials not configured (dev mode).
 */
export async function generateOrangeMoneyPayment(
  params: PaymentProviderParams
): Promise<PaymentProviderResult> {
  try {
    const config = await getExternalConfig()
    const safeAmount = validateAmount(params.amount)
    const safePhone = sanitizePhone(params.customerPhone)
    const safeOrder = sanitizeText(params.orderNumber, 'orderNumber', 100)

    if (!config.orangeMoneyClientId || !config.orangeMoneyClientSecret) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[payment.providers] Orange Money not configured, returning mock URL')
      }
      const mockToken = `om_mock_${safeOrder}_${Date.now()}`
      await storePaymentRecord({
        bookingId: safeOrder,
        bookingType: params.bookingType || 'order',
        phone: safePhone,
        provider: 'orange_money',
        country: 'SN',
        currency: params.currency || 'XOF',
        amount: safeAmount,
        externalRef: mockToken,
      })
      return {
        success: true,
        paymentUrl: `https://pay.maellis.aero/om?ref=${encodeURIComponent(safeOrder)}`,
        paymentToken: mockToken,
        externalRef: mockToken,
      }
    }

    // Orange Money Web Payment API
    const auth = Buffer.from(`${config.orangeMoneyClientId}:${config.orangeMoneyClientSecret}`).toString('base64')
    const url = `${config.orangeMoneyBaseUrl}/orange-money-webpayment/senegal/v1/webpayment`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchant_key: config.orangeMoneyMerchantId,
        amount: safeAmount,
        currency: params.currency || 'XOF',
        order_id: safeOrder,
        description: params.description || `Paiement ${safeOrder}`,
        customer_phone_number: safePhone,
        customer_name: params.customerName,
        customer_email: params.customerEmail || '',
        notify_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://maellis.aero'}/api/webhooks/orange-money`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://maellis.aero'}/dashboard/paiements`,
        lang: 'FR',
      }),
    })

    if (!response.ok) {
      throw new Error(`Orange Money API HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json() as Record<string, unknown>

    const paymentUrl = result.payment_url as string | undefined
    const payToken = result.pay_token as string | undefined || result.transaction_id as string | undefined

    if (!paymentUrl) {
      throw new Error('Orange Money response missing payment_url')
    }

    await storePaymentRecord({
      bookingId: safeOrder,
      bookingType: params.bookingType || 'order',
      phone: safePhone,
      provider: 'orange_money',
      country: 'SN',
      currency: params.currency || 'XOF',
      amount: safeAmount,
      externalRef: payToken,
    })

    return {
      success: true,
      paymentUrl,
      paymentToken: payToken,
      externalRef: payToken,
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid')) throw error
    return { success: false, error: safeError(error, 'Orange Money').message }
  }
}

/**
 * Handle Orange Money webhook callback.
 *
 * Expected body: { order_id, pay_token, transaction_id, amount, status, phone }
 */
export async function handleOrangeMoneyWebhook(
  body: Record<string, unknown>
): Promise<PaymentWebhookResult> {
  try {
    const orderNumber = body.order_id as string | undefined
    const payToken = body.pay_token as string | undefined || body.transaction_id as string | undefined
    const omStatus = (body.status as string || '').toUpperCase()
    const amount = parseFloat(String(body.amount || '0'))

    if (!orderNumber || !payToken) {
      return { success: false, message: 'Missing order_id or pay_token' }
    }

    const internalStatus = omStatus === 'SUCCESS' || omStatus === 'COMPLETED' ? 'paid' : 'failed'

    // Idempotency check
    const existing = await db.payment.findFirst({
      where: { externalRef: payToken, status: { in: ['paid', 'failed'] } },
    })
    if (existing) {
      return { success: true, message: `Already processed as ${existing.status}`, orderNumber, status: existing.status, provider: 'orange_money' }
    }

    // Update Payment record
    const paymentRecord = await db.payment.findFirst({ where: { bookingId: orderNumber, bookingType: 'order' } })
    if (paymentRecord) {
      await db.payment.update({
        where: { id: paymentRecord.id },
        data: { status: internalStatus, externalRef: payToken },
      })
    } else {
      await storePaymentRecord({
        bookingId: orderNumber,
        bookingType: 'order',
        phone: String(body.phone || ''),
        provider: 'orange_money',
        country: 'SN',
        currency: 'XOF',
        amount: Number.isFinite(amount) ? amount : 0,
        externalRef: payToken,
        status: internalStatus,
      })
    }

    // Update Order if exists
    const order = await db.order.findUnique({ where: { orderNumber } })
    if (order && internalStatus === 'paid') {
      await db.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'paid', status: 'confirmed', transactionId: payToken, paymentMethod: 'orange_money' },
      })
    }

    return { success: internalStatus === 'paid', message: `Payment ${internalStatus} for ${orderNumber}`, orderNumber, status: internalStatus, provider: 'orange_money' }
  } catch (error) {
    return { success: false, message: safeError(error, 'OM webhook').message }
  }
}

// ═══════════════════════════════════════════════════════════════
// 2. WAVE PROVIDER (Senegal)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a Wave checkout URL.
 *
 * Uses Wave Checkout API:
 * 1. POST /v1/checkout/sessions — create checkout session
 *    with Bearer Auth (clientSecret)
 * 2. Returns a checkout URL to redirect the customer
 *
 * Falls back to mock URL if credentials not configured (dev mode).
 */
export async function generateWavePayment(
  params: PaymentProviderParams
): Promise<PaymentProviderResult> {
  try {
    const config = await getExternalConfig()
    const safeAmount = validateAmount(params.amount)
    const safePhone = sanitizePhone(params.customerPhone)
    const safeOrder = sanitizeText(params.orderNumber, 'orderNumber', 100)

    if (!config.waveClientId || !config.waveClientSecret) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[payment.providers] Wave not configured, returning mock URL')
      }
      const mockToken = `wv_mock_${safeOrder}_${Date.now()}`
      await storePaymentRecord({
        bookingId: safeOrder,
        bookingType: params.bookingType || 'order',
        phone: safePhone,
        provider: 'wave',
        country: 'SN',
        currency: params.currency || 'XOF',
        amount: safeAmount,
        externalRef: mockToken,
      })
      return {
        success: true,
        paymentUrl: `https://pay.maellis.aero/wave?ref=${encodeURIComponent(safeOrder)}`,
        paymentToken: mockToken,
        externalRef: mockToken,
      }
    }

    // Wave Checkout API
    const url = `${config.waveBaseUrl}/v1/checkout/sessions`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.waveClientSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(safeAmount), // Wave expects integer XOF
        currency: 'XOF',
        error_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://maellis.aero'}/dashboard/paiements?error=1`,
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://maellis.aero'}/dashboard/paiements?success=1`,
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://maellis.aero'}/api/webhooks/wave`,
        client_reference: safeOrder,
        description: params.description || `Paiement ${safeOrder}`,
        customer_phone: safePhone,
        customer_name: params.customerName,
        meta: {
          order_number: safeOrder,
          booking_type: params.bookingType || 'order',
        },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Wave API HTTP ${response.status}: ${errorBody}`)
    }

    const result = await response.json() as Record<string, unknown>
    const waveUrl = result.wave_launch_url as string | undefined || result.checkout_url as string | undefined
    const sessionId = result.id as string | undefined

    if (!waveUrl) {
      throw new Error('Wave response missing checkout URL')
    }

    await storePaymentRecord({
      bookingId: safeOrder,
      bookingType: params.bookingType || 'order',
      phone: safePhone,
      provider: 'wave',
      country: 'SN',
      currency: params.currency || 'XOF',
      amount: safeAmount,
      externalRef: sessionId,
    })

    return {
      success: true,
      paymentUrl: waveUrl,
      paymentToken: sessionId,
      externalRef: sessionId,
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid')) throw error
    return { success: false, error: safeError(error, 'Wave').message }
  }
}

/**
 * Handle Wave webhook callback.
 *
 * Expected body: { data: { id, amount, currency, status, client_reference, customer_phone } }
 */
export async function handleWaveWebhook(
  body: Record<string, unknown>
): Promise<PaymentWebhookResult> {
  try {
    const data = body.data as Record<string, unknown> | undefined || body
    const sessionId = data.id as string | undefined
    const clientRef = data.client_reference as string | undefined
    const waveStatus = (data.status as string || '').toLowerCase()
    const amount = parseFloat(String(data.amount || '0'))

    if (!sessionId) {
      return { success: false, message: 'Missing session id' }
    }

    const orderNumber = clientRef || sessionId
    const internalStatus = waveStatus === 'completed' || waveStatus === 'succeeded' ? 'paid' : 'failed'

    // Idempotency check
    const existing = await db.payment.findFirst({
      where: { externalRef: sessionId, status: { in: ['paid', 'failed'] } },
    })
    if (existing) {
      return { success: true, message: `Already processed as ${existing.status}`, orderNumber, status: existing.status, provider: 'wave' }
    }

    // Update Payment record
    const paymentRecord = await db.payment.findFirst({ where: { bookingId: orderNumber } })
    if (paymentRecord) {
      await db.payment.update({
        where: { id: paymentRecord.id },
        data: { status: internalStatus, externalRef: sessionId },
      })
    } else {
      await storePaymentRecord({
        bookingId: orderNumber,
        bookingType: 'order',
        phone: String(data.customer_phone || ''),
        provider: 'wave',
        country: 'SN',
        currency: 'XOF',
        amount: Number.isFinite(amount) ? amount : 0,
        externalRef: sessionId,
        status: internalStatus,
      })
    }

    // Update Order if exists
    const order = await db.order.findUnique({ where: { orderNumber } })
    if (order && internalStatus === 'paid') {
      await db.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'paid', status: 'confirmed', transactionId: sessionId, paymentMethod: 'wave' },
      })
    }

    return { success: internalStatus === 'paid', message: `Payment ${internalStatus} for ${orderNumber}`, orderNumber, status: internalStatus, provider: 'wave' }
  } catch (error) {
    return { success: false, message: safeError(error, 'Wave webhook').message }
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. PAYMENT PROVIDER INTERFACE (Strategy Pattern)
// ═══════════════════════════════════════════════════════════════

/**
 * Unified interface for all payment providers.
 * Each provider must implement these 3 methods to be registered.
 *
 * To add a new provider:
 * 1. Create a class implementing PaymentProviderInterface
 * 2. Add an instance to the providerRegistry below
 * 3. Add credentials to ExternalApiConfig (prisma/schema.prisma)
 * 4. Add env vars to .env.example / .env.docker
 */
export interface PaymentProviderInterface {
  /** Unique provider identifier (e.g., 'orange_money', 'wave') */
  readonly name: string
  /** Human-readable display name */
  readonly displayName: string
  /** Generate a payment and return a URL/token for the customer */
  generatePayment(params: PaymentProviderParams): Promise<PaymentProviderResult>
  /** Handle an incoming webhook callback from the provider */
  handleWebhook(body: Record<string, unknown>): Promise<PaymentWebhookResult>
  /** Check payment status by external reference */
  checkStatus?(externalRef: string): Promise<PaymentCheckResult>
}

// ─── Orange Money Provider Class ─────────────────────────────

class OrangeMoneyProvider implements PaymentProviderInterface {
  readonly name = 'orange_money'
  readonly displayName = 'Orange Money'

  async generatePayment(params: PaymentProviderParams): Promise<PaymentProviderResult> {
    return generateOrangeMoneyPayment(params)
  }

  async handleWebhook(body: Record<string, unknown>): Promise<PaymentWebhookResult> {
    return handleOrangeMoneyWebhook(body)
  }

  async checkStatus(externalRef: string): Promise<PaymentCheckResult> {
    return checkProviderPaymentStatus(this.name, externalRef)
  }
}

// ─── Wave Provider Class ─────────────────────────────────────

class WaveProvider implements PaymentProviderInterface {
  readonly name = 'wave'
  readonly displayName = 'Wave'

  async generatePayment(params: PaymentProviderParams): Promise<PaymentProviderResult> {
    return generateWavePayment(params)
  }

  async handleWebhook(body: Record<string, unknown>): Promise<PaymentWebhookResult> {
    return handleWaveWebhook(body)
  }

  async checkStatus(externalRef: string): Promise<PaymentCheckResult> {
    return checkProviderPaymentStatus(this.name, externalRef)
  }
}

// ─── Provider Registry ───────────────────────────────────────

/**
 * Central registry of all payment providers.
 * Maps provider name → provider instance for O(1) lookup.
 *
 * To register a new provider: registry.set('new_provider', new NewProvider())
 */
const providerRegistry = new Map<string, PaymentProviderInterface>([
  ['orange_money', new OrangeMoneyProvider()],
  ['wave', new WaveProvider()],
])

/**
 * Get all registered provider names.
 * Useful for frontend dropdowns and admin configuration.
 */
export function getRegisteredProviders(): Array<{ name: string; displayName: string }> {
  return Array.from(providerRegistry.values()).map(p => ({ name: p.name, displayName: p.displayName }))
}

/**
 * Get a specific provider by name.
 * Throws if provider is not registered.
 */
export function getProvider(providerName: string): PaymentProviderInterface {
  const provider = providerRegistry.get(providerName)
  if (!provider) {
    throw new Error(`Unsupported payment provider: ${providerName}. Available: ${Array.from(providerRegistry.keys()).join(', ')}`)
  }
  return provider
}

// ═══════════════════════════════════════════════════════════════
// 4. UNIFIED PAYMENT FUNCTIONS (Route through registry)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a payment using the specified provider.
 *
 * Uses the Strategy pattern — resolves the provider from the registry
 * and delegates to its `generatePayment()` implementation.
 *
 * @param provider - Provider name (e.g., 'orange_money', 'wave')
 * @param params - Payment parameters
 * @returns PaymentProviderResult with payment URL/token or error
 */
export async function generatePayment(
  provider: string,
  params: PaymentProviderParams
): Promise<PaymentProviderResult> {
  try {
    const instance = getProvider(provider)
    return instance.generatePayment(params)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unsupported')) {
      return { success: false, error: error.message }
    }
    return { success: false, error: safeError(error, 'generatePayment').message }
  }
}

/**
 * Route a payment webhook to the correct provider handler.
 *
 * @param provider - Provider name
 * @param body - Raw webhook body
 * @returns PaymentWebhookResult
 */
export async function handlePaymentWebhook(
  provider: string,
  body: Record<string, unknown>
): Promise<PaymentWebhookResult> {
  try {
    const instance = getProvider(provider)
    return instance.handleWebhook(body)
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unsupported provider' }
  }
}

/**
 * Check payment status for a given provider and transaction.
 * Currently does a DB lookup only; providers can override with live API checks.
 */
export async function checkProviderPaymentStatus(
  provider: string,
  externalRef: string
): Promise<PaymentCheckResult> {
  const payment = await db.payment.findFirst({
    where: { externalRef },
  })

  if (!payment) {
    return { status: 'pending', amount: 0, provider, timestamp: null }
  }

  return {
    status: payment.status as 'paid' | 'pending' | 'failed',
    amount: payment.amount,
    provider: payment.provider,
    timestamp: payment.updatedAt.toISOString(),
  }
}
