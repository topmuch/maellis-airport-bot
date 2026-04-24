import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { parseBody, ValidationError } from '@/lib/validate'

/**
 * POST /api/bot/payment/link — Generate a payment link
 *
 * Accepts: { amount, currency?, provider?, reference?, description?, phone?, bookingType?, bookingId? }
 * Returns: Payment URL, transaction reference, and status
 *
 * Supports:
 * - CinetPay integration (when CINETPAY_API_KEY is configured)
 * - Mock payment link generation (fallback/development)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }

    const body = await parseBody(request);
    const {
      amount,
      currency,
      provider,
      reference,
      description,
      phone,
      bookingType,
      bookingId,
    } = body;

    // Validate required fields
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'A valid positive amount is required' },
        { status: 400 },
      );
    }

    // Generate transaction reference if not provided
    const txRef = reference || `TX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const paymentCurrency = currency || 'XOF';
    const paymentProvider = provider || 'mobile_money';
    const paymentDescription = description || `MAELLIS Payment - ${txRef}`;

    // Try CinetPay integration
    const cinetpayResponse = await tryCinetPay({
      amount,
      currency: paymentCurrency,
      provider: paymentProvider,
      reference: txRef,
      description: paymentDescription,
      phone,
    });

    if (cinetpayResponse) {
      // Store payment record in database
      await storePayment({
        amount,
        currency: paymentCurrency,
        provider: paymentProvider,
        reference: txRef,
        description: paymentDescription,
        phone,
        bookingType,
        bookingId,
        externalRef: cinetpayResponse.transactionId,
        status: 'pending',
      });

      return NextResponse.json({
        success: true,
        paymentUrl: cinetpayResponse.paymentUrl,
        reference: txRef,
        amount,
        currency: paymentCurrency,
        provider: paymentProvider,
        transactionId: cinetpayResponse.transactionId,
        status: 'pending',
        expiresAt: cinetpayResponse.expiresAt,
        _provider: 'cinetpay',
      });
    }

    // Fallback: Generate mock payment link
    const mockPayment = generateMockPaymentLink({
      amount,
      currency: paymentCurrency,
      provider: paymentProvider,
      reference: txRef,
      description: paymentDescription,
      phone,
    });

    // Store payment record in database
    await storePayment({
      amount,
      currency: paymentCurrency,
      provider: paymentProvider,
      reference: txRef,
      description: paymentDescription,
      phone,
      bookingType,
      bookingId,
      status: 'pending',
    });

    return NextResponse.json({
      ...mockPayment,
      _provider: 'mock',
      _serviceAvailable: false,
    });
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error in /api/bot/payment/link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Try to create a CinetPay payment link.
 * Returns null if CinetPay is not configured or the request fails.
 */
async function tryCinetPay(params: {
  amount: number;
  currency: string;
  provider: string;
  reference: string;
  description: string;
  phone?: string;
}): Promise<{ paymentUrl: string; transactionId: string; expiresAt: string } | null> {
  const apiKey = process.env.CINETPAY_API_KEY;
  const siteId = process.env.CINETPAY_SITE_ID;
  const secretKey = process.env.CINETPAY_SECRET_KEY;

  if (!apiKey || !siteId || !secretKey) {
    console.log('CinetPay not configured, using mock payment');
    return null;
  }

  try {
    const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency,
        description: params.description,
        transaction_id: params.reference,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://maellis.ai'}/payment/callback`,
        notify_url: '/api/payments/webhook',
        customer_phone: params.phone || '',
        lang: 'fr',
      }),
    });

    if (!response.ok) {
      console.error(`CinetPay error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.code === '201' && data.data) {
      return {
        paymentUrl: data.data.payment_url || data.data.payment_link,
        transactionId: data.data.payment_token || params.reference,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      };
    }

    console.error('CinetPay unexpected response:', data);
    return null;
  } catch (error) {
    console.error('CinetPay request failed:', error);
    return null;
  }
}

/**
 * Generate a mock payment link for development/testing.
 */
function generateMockPaymentLink(params: {
  amount: number;
  currency: string;
  provider: string;
  reference: string;
  description: string;
  phone?: string;
}): Record<string, unknown> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://maellis.ai';
  const paymentUrl = `${baseUrl}/payment/mock/${params.reference}`;

  const providerLabels: Record<string, string> = {
    mobile_money: 'Mobile Money',
    mtn: 'MTN Mobile Money',
    orange: 'Orange Money',
    moov: 'Moov Money',
    card: 'Carte bancaire',
    cinetpay: 'CinetPay',
  };

  return {
    success: true,
    paymentUrl,
    reference: params.reference,
    amount: params.amount,
    currency: params.currency,
    provider: params.provider,
    providerLabel: providerLabels[params.provider] || params.provider,
    description: params.description,
    phone: params.phone || null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    instructions: [
      `Montant: ${params.amount.toLocaleString()} ${params.currency}`,
      `Référence: ${params.reference}`,
      `Méthode: ${providerLabels[params.provider] || params.provider}`,
      'Veuillez utiliser le lien de paiement pour effectuer votre règlement.',
    ],
    fallback: true,
  };
}

/**
 * Store payment record in database.
 */
async function storePayment(params: {
  amount: number;
  currency: string;
  provider: string;
  reference: string;
  description: string;
  phone?: string;
  bookingType?: string;
  bookingId?: string;
  externalRef?: string;
  status: string;
}) {
  try {
    await db.payment.create({
      data: {
        bookingId: params.bookingId || null,
        bookingType: params.bookingType || 'general',
        phone: params.phone || '',
        provider: params.provider,
        country: 'CI',
        currency: params.currency,
        amount: params.amount,
        status: params.status,
        externalRef: params.externalRef || null,
      },
    });
  } catch (dbError) {
    console.error('Failed to store payment:', dbError);
  }
}
