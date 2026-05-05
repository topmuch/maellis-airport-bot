import { NextRequest } from 'next/server'
import { createHmac } from 'crypto'

// ═══════════════════════════════════════════════════════════════
// Webhook Signature Verification for CinetPay
// ═══════════════════════════════════════════════════════════════
//
// CinetPay sends a signature in the `X-CinetPay-Signature` header
// (or falls back to a `cpm_signature` body field) that is an
// HMAC-SHA256 of the raw JSON body signed with the webhook secret.
//
// Set CINETPAY_WEBHOOK_SECRET in your environment variables.

/**
 * Verify that an incoming webhook request carries a valid CinetPay signature.
 *
 * Supports two sources of the signature:
 *  1. `X-CinetPay-Signature` HTTP header (preferred)
 *  2. `cpm_signature` field in the JSON body (fallback)
 *
 * If CINETPAY_WEBHOOK_SECRET is not configured (dev environments), the
 * verification is **skipped** with a warning — production MUST set it.
 *
 * @returns `true` when the signature is valid or verification is intentionally
 *          skipped; `false` when the signature is present but invalid.
 */
export async function verifyCinetPaySignature(
  request: NextRequest,
  rawBody: string,
  jsonBody: Record<string, unknown>
): Promise<{ valid: boolean; reason: string }> {
  const secret = process.env.CINETPAY_WEBHOOK_SECRET

  // ── Dev-mode bypass: no secret configured ──
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return { valid: false, reason: 'CINETPAY_WEBHOOK_SECRET is required in production' }
    }
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[webhook-verify] CINETPAY_WEBHOOK_SECRET is not configured. ' +
        'Webhook signature verification is SKIPPED. This is only safe in development.'
      )
    }
    return { valid: true, reason: 'DEV_MODE_NO_SECRET' }
  }

  // ── Extract signature from header (preferred) or body field ──
  const headerSignature = request.headers.get('x-cinetpay-signature')
  const bodySignature = typeof jsonBody.cpm_signature === 'string'
    ? jsonBody.cpm_signature
    : null
  const providedSignature = headerSignature ?? bodySignature

  if (!providedSignature) {
    return {
      valid: false,
      reason: 'No signature found in X-CinetPay-Signature header or cpm_signature body field',
    }
  }

  // ── Compute expected HMAC-SHA256 ──
  const expectedSignature = createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex')

  // ── Constant-time comparison to prevent timing attacks ──
  if (!timingSafeEqual(providedSignature, expectedSignature)) {
    return { valid: false, reason: 'Signature mismatch' }
  }

  return { valid: true, reason: 'VERIFIED' }
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Compares two hex strings of equal-ish length safely.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false

  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')

  if (bufA.length !== bufB.length) return false

  const result = Buffer.alloc(bufA.length)
  for (let i = 0; i < bufA.length; i++) {
    result[i] = bufA[i] ^ bufB[i]
  }

  // result must be all zeros
  return result.every((byte) => byte === 0)
}
