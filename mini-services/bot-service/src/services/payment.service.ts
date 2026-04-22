// ============================================================================
// MAELLIS Airport Bot — Payment Service (CinetPay / Orange Money / Wave)
// ============================================================================

import type { PaymentLinkParams, PaymentProvider, PaymentStatus } from "../types";

// ---- Payment Link Generation ----

/**
 * Generate a payment link via CinetPay or mock fallback.
 *
 * Providers:
 * - OM: Orange Money
 * - WAVE: Wave
 * - CINETPAY: CinetPay (supports all methods)
 */
export function generatePaymentLink(params: PaymentLinkParams): string {
  const cinetPayKey = process.env.CINETPAY_API_KEY;
  const cinetPaySiteId = process.env.CINETPAY_SITE_ID;

  if (cinetPayKey && cinetPaySiteId) {
    // Real CinetPay integration
    const cinetPayUrl = "https://pay.cinetpay.com/fr/";
    const searchParams = new URLSearchParams({
      amount: String(params.amount),
      currency: params.currency || "XOF",
      description: params.description,
      reference: params.reference,
      site_id: cinetPaySiteId,
      api_key: cinetPayKey,
    });

    if (params.phone) {
      searchParams.set("customer_phone", params.phone);
    }

    return `${cinetPayUrl}?${searchParams.toString()}`;
  }

  // Fallback: generate a mock payment link
  const mockUrl = "https://pay.maellis.aero/pay";
  const searchParams = new URLSearchParams({
    amount: String(params.amount),
    currency: params.currency || "XOF",
    provider: params.provider,
    ref: params.reference,
    desc: params.description,
  });

  if (params.phone) {
    searchParams.set("phone", params.phone);
  }

  return `${mockUrl}?${searchParams.toString()}`;
}

// ---- Payment Status Check ----

/**
 * Check the status of a payment transaction via CinetPay API.
 * Falls back to mock status when API keys are not configured.
 */
export async function getPaymentStatus(
  transactionId: string,
): Promise<PaymentStatus> {
  const cinetPayKey = process.env.CINETPAY_API_KEY;
  const cinetPaySiteId = process.env.CINETPAY_SITE_ID;

  if (cinetPayKey && cinetPaySiteId) {
    try {
      // CinetPay check payment endpoint
      const res = await fetch("https://api-check.cinetpay.com/v2/payment/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apikey: cinetPayKey,
          site_id: cinetPaySiteId,
          transaction_id: transactionId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          transactionId,
          status: mapCinetPayStatus(data.data?.status || "PENDING"),
          amount: data.data?.amount || 0,
          currency: data.data?.currency || "XOF",
          provider: data.data?.payment_method || "CINETPAY" as PaymentProvider,
          timestamp: data.data?.created_at || new Date().toISOString(),
        };
      }
    } catch (err) {
      console.error("❌ CinetPay status check failed:", err);
    }
  }

  // Fallback: return mock status
  return getMockPaymentStatus(transactionId);
}

// ---- Provider Labels ----

/**
 * Get the display name for a payment provider.
 */
export function getProviderLabel(provider: PaymentProvider): string {
  const labels: Record<PaymentProvider, string> = {
    OM: "📱 Orange Money",
    WAVE: "🔵 Wave",
    CINETPAY: "💳 CinetPay",
  };
  return labels[provider];
}

/**
 * Get all available payment providers.
 */
export function getAvailableProviders(): Array<{
  id: PaymentProvider;
  name: string;
  description: string;
}> {
  return [
    {
      id: "OM",
      name: "Orange Money",
      description: "Paiement via Orange Money (#144#)",
    },
    {
      id: "WAVE",
      name: "Wave",
      description: "Paiement via Wave",
    },
    {
      id: "CINETPAY",
      name: "CinetPay",
      description: "Carte bancaire & Mobile Money",
    },
  ];
}

// ---- Helpers ----

function mapCinetPayStatus(status: string): PaymentStatus["status"] {
  const mapping: Record<string, PaymentStatus["status"]> = {
    ACCEPTED: "success",
    COMPLETED: "success",
    PENDING: "pending",
    PROCESSING: "pending",
    REFUSED: "failed",
    CANCELLED: "failed",
    EXPIRED: "expired",
  };
  return mapping[status] || "pending";
}

function getMockPaymentStatus(transactionId: string): PaymentStatus {
  return {
    transactionId,
    status: "pending",
    amount: 0,
    currency: "XOF",
    provider: "CINETPAY",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check if CinetPay API keys are configured.
 */
export function isCinetPayConfigured(): boolean {
  return !!(process.env.CINETPAY_API_KEY && process.env.CINETPAY_SITE_ID);
}
