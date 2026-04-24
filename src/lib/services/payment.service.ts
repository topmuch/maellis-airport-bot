import { db } from '@/lib/db'

// ═══════════════════════════════════════════════════════════════
// MAELLIS Marketplace — Payment Service
// Full integration with CinetPay mobile money payment gateway
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────

/** Parameters for generating a CinetPay payment */
export interface GeneratePaymentParams {
  orderNumber: string
  amount: number
  customerName: string
  customerPhone: string
  customerEmail?: string
  description: string
}

/** Response from CinetPay payment generation */
export interface GeneratePaymentResult {
  paymentUrl: string
  paymentToken: string
}

/** Parameters for the CinetPay checkout API request */
export interface CinetPayCheckoutRequest {
  site_id: string
  apikey: string
  amount: number
  currency: string
  description: string
  transaction_id: string
  customer_name: string
  customer_surname: string
  customer_phone_number: string
  customer_email?: string
  notify_url?: string
  return_url?: string
  channels?: string
  lang?: string
}

/** Response from CinetPay checkout API */
export interface CinetPayCheckoutResponse {
  code: string
  message: string
  data?: {
    payment_url?: string
    payment_token?: string
    trans_id?: string
    [key: string]: unknown
  }
  api_version?: string
}

/** Response from CinetPay payment check API */
export interface CinetPayCheckResponse {
  code: string
  message: string
  data?: {
    cpm_trans_id?: string
    cpm_amount?: string
    cpm_currency?: string
    cpm_trans_status?: string
    cpm_payment_date?: string
    cpm_payment_time?: string
    cpm_phone_prefixe?: string
    cpm_phone_num?: string
    cpm_pay_id?: string
    cpm_custom?: string
    cpm_error_message?: string
    [key: string]: unknown
  }
  api_version?: string
}

/** Result of checking payment status */
export interface PaymentStatusResult {
  status: 'paid' | 'pending' | 'failed'
  amount: number
  provider: string
  timestamp: string | null
}

/** Result of processing a CinetPay webhook notification */
export interface WebhookResult {
  success: boolean
  message: string
  orderNumber?: string
  status?: string
}

/** CinetPay webhook notification body */
export interface CinetPayWebhookBody {
  cpm_trans_id: string
  cpm_amount: string
  cpm_currency: string
  cpm_trans_status: string
  cpm_custom: string
  cpm_phone_prefixe: string
  cpm_phone_num: string
  cpm_pay_id: string
  cpm_payment_date: string
  cpm_payment_time: string
  cpm_error_message?: string
}

/** Parameters for creating a Payment record */
export interface CreatePaymentData {
  bookingId: string
  bookingType: string
  phone: string
  provider: string
  country: string
  amount: number
  externalRef?: string
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const CINETPAY_CHECKOUT_URL = 'https://api-checkout.cinetpay.com/v2/payment'
const CINETPAY_CHECK_URL = 'https://api-check.cinetpay.com/v2/payment/check'

const DEFAULT_CURRENCY = 'XOF'
const DEFAULT_COUNTRY = 'SN'

/** Mapping from CinetPay status values to our internal status */
const STATUS_MAP: Record<string, 'paid' | 'pending' | 'failed'> = {
  ACCEPTED: 'paid',
  COMPLETED: 'paid',
  REFUSED: 'failed',
  CANCELLED: 'failed',
  EXPIRED: 'failed',
  PENDING: 'pending',
  PROCESSING: 'pending',
}

// ─────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────

/**
 * Validate that a monetary amount is a positive, finite number.
 * Throws a descriptive error if invalid.
 */
function validatePositiveAmount(amount: unknown, field = 'amount'): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || isNaN(amount) || amount <= 0) {
    throw new Error(`Invalid ${field}: must be a positive number, received ${amount}`)
  }
  return Math.round(amount * 100) / 100 // round to 2 decimal places
}

/**
 * Validate a phone number contains only digits, spaces, +, and -.
 * Returns the stripped/normalized phone, or throws.
 */
function sanitizePhone(phone: unknown, field = 'phone'): string {
  if (typeof phone !== 'string' || phone.trim().length === 0) {
    throw new Error(`${field} is required and must be a non-empty string`)
  }
  const cleaned = phone.trim()
  if (!/^[+\d\s\-()]{6,20}$/.test(cleaned)) {
    throw new Error(`Invalid ${field}: must be 6-20 characters and contain only digits, spaces, +, -, ()`)
  }
  return cleaned
}

/**
 * Sanitize a free-text string: trim, limit length.
 */
function sanitizeText(value: unknown, field: string, maxLength = 500): string {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string`)
  }
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    throw new Error(`${field} is required`)
  }
  if (trimmed.length > maxLength) {
    throw new Error(`${field} must be at most ${maxLength} characters`)
  }
  return trimmed
}

/**
 * Wrap a raw internal error into a safe, user-facing message.
 * Logs the original error but never leaks internals.
 */
function safeError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (process.env.NODE_ENV === 'development') {
    console.error(`[payment.service] ${context}:`, message)
  }
  return new Error(`An error occurred while processing your ${context}. Please try again later.`)
}

/**
 * Split a full name into first name and last name.
 * If only one word is provided, it becomes the surname with an empty name.
 */
function splitFullName(fullName: string): { name: string; surname: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) {
    return { name: '', surname: parts[0] }
  }
  return {
    name: parts.slice(0, -1).join(' '),
    surname: parts[parts.length - 1],
  }
}

/**
 * Map CinetPay's cpm_trans_status to our internal payment status.
 * Falls back to 'pending' for unknown statuses.
 */
function mapCinetPayStatus(cinetStatus: string): 'paid' | 'pending' | 'failed' {
  return STATUS_MAP[cinetStatus.toUpperCase()] ?? 'pending'
}

/**
 * Check if a CinetPay status represents a successful payment.
 */
function isSuccessfulStatus(cinetStatus: string): boolean {
  const mapped = mapCinetPayStatus(cinetStatus)
  return mapped === 'paid'
}

/**
 * Validate that required webhook fields are present in the notification body.
 */
function validateWebhookBody(
  body: Record<string, unknown>
): boolean {
  const required: string[] = [
    'cpm_trans_id',
    'cpm_amount',
    'cpm_currency',
    'cpm_trans_status',
    'cpm_custom',
    'cpm_phone_prefixe',
    'cpm_phone_num',
    'cpm_pay_id',
    'cpm_payment_date',
    'cpm_payment_time',
  ]
  return required.every((field) => {
    const value = body[field]
    return value !== undefined && value !== null && value !== ''
  })
}

/**
 * Extract the phone prefix (country code) from a phone number string.
 * Strips leading '+' if present.
 */
function extractPhonePrefix(phone: string): string {
  const cleaned = phone.replace(/\s/g, '')
  // If it starts with +, try to extract the country code (1-3 digits)
  if (cleaned.startsWith('+')) {
    const match = cleaned.match(/^\+(\d{1,3})/)
    return match ? match[1] : '221'
  }
  // Default Senegal prefix
  return '221'
}

/**
 * Extract the local phone number (without country code).
 */
function extractLocalPhone(phone: string): string {
  const cleaned = phone.replace(/\s/g, '')
  // Remove leading + and country code if present
  if (cleaned.startsWith('+')) {
    const withoutPlus = cleaned.slice(1)
    // Remove country code (1-3 digits) if the remaining part is long enough
    const match = withoutPlus.match(/^(\d{1,3})(\d{6,})$/)
    return match ? match[2] : withoutPlus
  }
  return cleaned
}

// ═══════════════════════════════════════════════════════════════
// 1. GENERATE CINETPAY PAYMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a CinetPay payment link for an order.
 *
 * If CINETPAY_API_KEY is not configured, returns a mock payment URL
 * for development/testing purposes.
 *
 * Also stores a Payment record with status "pending" for tracking.
 *
 * @param params - Order and customer details for the payment
 * @returns Object with paymentUrl and paymentToken
 * @throws Error if the API call fails and no fallback is available
 */
export async function generateCinetPayPayment(
  params: GeneratePaymentParams
): Promise<GeneratePaymentResult> {
  try {
    // ── Validate inputs ──
    const safeAmount = validatePositiveAmount(params.amount, 'payment amount')
    const safeOrderNumber = sanitizeText(params.orderNumber, 'orderNumber', 100)
    const safeCustomerName = sanitizeText(params.customerName, 'customerName', 200)
    const safeCustomerPhone = sanitizePhone(params.customerPhone, 'customerPhone')
    const safeDescription = sanitizeText(params.description, 'description', 500)
    const safeCustomerEmail = params.customerEmail?.trim() || undefined

    const apiKey = process.env.CINETPAY_API_KEY
    const siteId = process.env.CINETPAY_SITE_ID
    const { name, surname } = splitFullName(safeCustomerName)

    const requestBody: CinetPayCheckoutRequest = {
      site_id: siteId ?? '',
      apikey: apiKey ?? '',
      amount: safeAmount,
      currency: DEFAULT_CURRENCY,
      description: safeDescription,
      transaction_id: safeOrderNumber,
      customer_name: name,
      customer_surname: surname,
      customer_phone_number: safeCustomerPhone,
      customer_email: safeCustomerEmail,
      channels: 'ALL',
      lang: 'FR',
    }

    // ── Fallback for missing API credentials ──
    if (!apiKey || !siteId) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[payment.service] CINETPAY_API_KEY or CINETPAY_SITE_ID not configured. ' +
          'Returning mock payment URL for development.'
        )
      }

      const mockResult: GeneratePaymentResult = {
        paymentUrl: `https://pay.maellis.aero/pay?ref=${encodeURIComponent(safeOrderNumber)}`,
        paymentToken: `mock_token_${safeOrderNumber}_${Date.now()}`,
      }

      // Store pending Payment record even for mock payments
      await db.payment.create({
        data: {
          bookingId: safeOrderNumber,
          bookingType: 'order',
          phone: safeCustomerPhone,
          provider: 'cinetpay',
          country: DEFAULT_COUNTRY,
          currency: DEFAULT_CURRENCY,
          amount: safeAmount,
          status: 'pending',
          externalRef: mockResult.paymentToken,
        },
      })

      return mockResult
    }

    // ── Live CinetPay API call ──
    const response = await fetch(CINETPAY_CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(
        `CinetPay API returned HTTP ${response.status}: ${response.statusText}`
      )
    }

    const result: CinetPayCheckoutResponse = await response.json()

    if (result.code !== '201') {
      throw safeError(
        new Error(`CinetPay code ${result.code}: ${result.message}`),
        'payment generation'
      )
    }

    if (!result.data?.payment_url || !result.data?.payment_token) {
      throw new Error(
        'CinetPay response missing payment_url or payment_token'
      )
    }

    const paymentResult: GeneratePaymentResult = {
      paymentUrl: result.data.payment_url,
      paymentToken: result.data.payment_token,
    }

    // Store pending Payment record
    await db.payment.create({
      data: {
        bookingId: params.orderNumber,
        bookingType: 'order',
        phone: params.customerPhone,
        provider: 'cinetpay',
        country: DEFAULT_COUNTRY,
        currency: DEFAULT_CURRENCY,
        amount: safeAmount,
        status: 'pending',
        externalRef: result.data.trans_id ?? result.data.payment_token,
      },
    })

    return paymentResult
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.startsWith('An error occurred'))) {
      throw error
    }
    throw safeError(error, 'payment generation')
  }
}

// ═══════════════════════════════════════════════════════════════
// 2. HANDLE CINETPAY WEBHOOK
// ═══════════════════════════════════════════════════════════════

/**
 * Process an incoming CinetPay webhook notification.
 *
 * Features:
 *  - Validates required webhook fields
 *  - Idempotent: skips if the transaction (externalRef) was already processed
 *  - On success: updates Order (paymentStatus, status, transactionId, paymentMethod)
 *                and Payment record (status → "paid")
 *  - On failure: updates Payment record (status → "failed", errorMessage)
 *
 * @param body - Raw CinetPay webhook JSON body
 * @returns WebhookResult indicating success/failure with details
 */
export async function handleCinetPayWebhook(
  body: Record<string, unknown>
): Promise<WebhookResult> {
  try {
    // ── Validate webhook body ──
    if (!validateWebhookBody(body)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[payment.service] Webhook validation failed: missing required fields'
        )
      }
      return {
        success: false,
        message: 'Webhook validation failed: missing required fields',
      }
    }

    const webhook = body as unknown as CinetPayWebhookBody

    const {
      cpm_trans_id: transactionId,
      cpm_amount: amount,
      cpm_currency: currency,
      cpm_trans_status: cinetStatus,
      cpm_custom: orderNumber,
      cpm_phone_prefixe: phonePrefix,
      cpm_phone_num: phoneNumber,
      cpm_pay_id: payId,
      cpm_payment_date: paymentDate,
      cpm_payment_time: paymentTime,
      cpm_error_message: errorMessage,
    } = webhook

    const internalStatus = mapCinetPayStatus(cinetStatus)
    const rawAmount = parseFloat(amount)
    if (!Number.isFinite(rawAmount) || isNaN(rawAmount) || rawAmount < 0) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[payment.service] Webhook received invalid amount:', amount)
      }
      return {
        success: false,
        message: 'Invalid payment amount received from provider',
      }
    }
    const safeAmount = Math.round(rawAmount * 100) / 100
    const fullPhone = `${String(phonePrefix)}${String(phoneNumber)}`

    // ── Idempotency check: has this transaction already been processed? ──
    const existingPayment = await db.payment.findFirst({
      where: {
        externalRef: transactionId,
        status: { in: ['paid', 'failed'] },
      },
    })

    if (existingPayment) {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[payment.service] Transaction ${transactionId} already processed ` +
          `(status: ${existingPayment.status}). Skipping.`
        )
      }
      return {
        success: true,
        message: `Transaction already processed as "${existingPayment.status}"`,
        orderNumber,
        status: existingPayment.status,
      }
    }

    // ── Find the Payment record for this transaction ──
    const paymentRecord = await db.payment.findFirst({
      where: {
        bookingId: orderNumber,
        bookingType: 'order',
      },
    })

    // ── Find the Order by orderNumber ──
    const order = await db.order.findUnique({
      where: { orderNumber },
    })

    if (!order) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[payment.service] Order not found for webhook. Updating Payment record status only.`
        )
      }
    }

    if (isSuccessfulStatus(cinetStatus)) {
      // ── PAYMENT SUCCESSFUL ──

      // Update Payment record
      if (paymentRecord) {
        await db.payment.update({
          where: { id: paymentRecord.id },
          data: {
            status: 'paid',
            externalRef: transactionId,
          },
        })
      } else {
        // Create Payment record if none exists (defensive)
        await db.payment.create({
          data: {
            bookingId: orderNumber,
            bookingType: 'order',
            phone: fullPhone,
            provider: 'cinetpay',
            country: DEFAULT_COUNTRY,
            currency: currency || DEFAULT_CURRENCY,
            amount: safeAmount,
            status: 'paid',
            externalRef: transactionId,
          },
        })
      }

      // Update Order record
      if (order) {
        await db.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'paid',
            status: 'confirmed',
            transactionId,
            paymentMethod: 'cinetpay',
          },
        })
      }

      return {
        success: true,
        message: `Payment confirmed for order ${orderNumber}`,
        orderNumber,
        status: 'paid',
      }
    } else {
      // ── PAYMENT FAILED ──

      // Update Payment record
      if (paymentRecord) {
        await db.payment.update({
          where: { id: paymentRecord.id },
          data: {
            status: 'failed',
            externalRef: transactionId,
            errorMessage: errorMessage ?? `Payment ${cinetStatus}`,
          },
        })
      } else {
        // Create Payment record if none exists (defensive)
        await db.payment.create({
          data: {
            bookingId: orderNumber,
            bookingType: 'order',
            phone: fullPhone,
            provider: 'cinetpay',
            country: DEFAULT_COUNTRY,
            currency: currency || DEFAULT_CURRENCY,
            amount: safeAmount,
            status: 'failed',
            externalRef: transactionId,
            errorMessage: errorMessage ?? `Payment ${cinetStatus}`,
          },
        })
      }

      // Optionally update Order paymentStatus if order exists
      if (order && order.paymentStatus === 'pending') {
        await db.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'failed',
          },
        })
      }

      return {
        success: false,
        message: `Payment ${cinetStatus} for order ${orderNumber}`,
        orderNumber,
        status: 'failed',
      }
    }
  } catch (error) {
    throw safeError(error, 'webhook processing')
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. CHECK PAYMENT STATUS
// ═══════════════════════════════════════════════════════════════

/**
 * Check the status of a CinetPay payment transaction.
 *
 * Sends a POST request to CinetPay's check endpoint with the API
 * credentials and transaction ID. Maps the returned status to our
 * internal status format.
 *
 * @param transactionId - The CinetPay transaction ID (cpm_trans_id)
 * @returns PaymentStatusResult with mapped status, amount, provider, and timestamp
 * @throws Error if API call fails or credentials are missing
 */
export async function checkPaymentStatus(
  transactionId: string
): Promise<PaymentStatusResult> {
  try {
    const apiKey = process.env.CINETPAY_API_KEY
    const siteId = process.env.CINETPAY_SITE_ID

    if (!apiKey || !siteId) {
      throw new Error(
        'CINETPAY_API_KEY and CINETPAY_SITE_ID must be configured to check payment status'
      )
    }

    const requestBody = {
      apikey: apiKey,
      site_id: siteId,
      transaction_id: transactionId,
    }

    const response = await fetch(CINETPAY_CHECK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw safeError(
        new Error(`CinetPay check API HTTP ${response.status}`),
        'payment status check'
      )
    }

    const result: CinetPayCheckResponse = await response.json()

    if (result.code !== '200' && result.code !== '201') {
      throw safeError(
        new Error(`CinetPay check code ${result.code}`),
        'payment status check'
      )
    }

    const data = result.data

    if (!data) {
      throw new Error('CinetPay check returned no data')
    }

    const status = mapCinetPayStatus(data.cpm_trans_status ?? 'PENDING')
    const rawAmount = parseFloat(data.cpm_amount ?? '0')
    const safeAmount = (Number.isFinite(rawAmount) && !isNaN(rawAmount))
      ? Math.round(rawAmount * 100) / 100
      : 0

    return {
      status,
      amount: safeAmount,
      provider: 'cinetpay',
      timestamp: data.cpm_payment_date && data.cpm_payment_time
        ? `${data.cpm_payment_date} ${data.cpm_payment_time}`
        : null,
    }
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('CinetPay') || error.message.startsWith('An error occurred'))) {
      throw error
    }
    throw safeError(error, 'payment status check')
  }
}

// ═══════════════════════════════════════════════════════════════
// 4. GET ORDER PAYMENT LINK (Convenience)
// ═══════════════════════════════════════════════════════════════

/**
 * Convenience function that generates a CinetPay payment link for an order.
 *
 * Wraps `generateCinetPayPayment` with sensible defaults for the description.
 *
 * @param orderNumber - The unique order number (e.g. "ORD-2026-001234")
 * @param amount - Total amount to charge
 * @param customerName - Full name of the customer
 * @param customerPhone - Customer's phone number
 * @param customerEmail - Optional customer email
 * @returns GeneratePaymentResult with paymentUrl and paymentToken
 */
export async function getOrderPaymentLink(
  orderNumber: string,
  amount: number,
  customerName: string,
  customerPhone: string,
  customerEmail?: string
): Promise<GeneratePaymentResult> {
  return generateCinetPayPayment({
    orderNumber,
    amount,
    customerName,
    customerPhone,
    customerEmail,
    description: `Paiement commande — MAELLIS Marketplace`,
  })
}

// ═══════════════════════════════════════════════════════════════
// 5. CREATE PAYMENT RECORD
// ═══════════════════════════════════════════════════════════════

/**
 * Create a Payment record in the database.
 *
 * Used to manually track payments associated with bookings
 * (transport, lounge, etc.) when the Payment record isn't created
 * automatically by the payment generation flow.
 *
 * @param data - Payment record details
 * @returns The created Payment record
 */
export async function createPaymentRecord(
  data: CreatePaymentData
) {
  try {
    const safeAmount = validatePositiveAmount(data.amount, 'payment amount')
    const safeBookingId = sanitizeText(data.bookingId, 'bookingId', 200)
    const safeBookingType = sanitizeText(data.bookingType, 'bookingType', 50)
    const safePhone = sanitizePhone(data.phone, 'phone')
    const safeProvider = sanitizeText(data.provider, 'provider', 50)
    const safeCountry = sanitizeText(data.country, 'country', 10)

    return await db.payment.create({
      data: {
        bookingId: safeBookingId,
        bookingType: safeBookingType,
        phone: safePhone,
        provider: safeProvider,
        country: safeCountry,
        currency: DEFAULT_CURRENCY,
        amount: safeAmount,
        status: 'pending',
        externalRef: data.externalRef ?? null,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid')) {
      throw error
    }
    throw safeError(error, 'payment record creation')
  }
}

// ═══════════════════════════════════════════════════════════════
// 6. GET PAYMENT BY BOOKING
// ═══════════════════════════════════════════════════════════════

/**
 * Retrieve all Payment records for a given booking.
 *
 * @param bookingId - The booking reference or ID
 * @param bookingType - Type of booking (e.g. "transport", "lounge", "order")
 * @returns Array of Payment records, ordered by most recent first
 */
export async function getPaymentByBooking(
  bookingId: string,
  bookingType: string
) {
  try {
    return await db.payment.findMany({
      where: {
        bookingId,
        bookingType,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  } catch (error) {
    throw safeError(error, 'payment lookup')
  }
}
