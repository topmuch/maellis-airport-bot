import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const BOT_SERVICE_URL = 'http://localhost:3005';

/**
 * POST /api/bot/baggage/generate — Proxy to bot service for baggage QR generation
 *
 * Accepts: { passengerName, phone, flightNumber, pnr, destination }
 * Returns: QR token, tracking URL, and tag information
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }

    const body = await request.json();
    const { passengerName, phone, flightNumber, pnr, destination } = body;

    // Validate required fields
    if (!passengerName || typeof passengerName !== 'string') {
      return NextResponse.json(
        { error: 'passengerName is required and must be a string' },
        { status: 400 },
      );
    }

    if (!flightNumber || typeof flightNumber !== 'string') {
      return NextResponse.json(
        { error: 'flightNumber is required and must be a string' },
        { status: 400 },
      );
    }

    if (!pnr || typeof pnr !== 'string') {
      return NextResponse.json(
        { error: 'pnr is required and must be a string' },
        { status: 400 },
      );
    }

    if (!destination || typeof destination !== 'string') {
      return NextResponse.json(
        { error: 'destination is required and must be a string' },
        { status: 400 },
      );
    }

    // Build proxy body
    const proxyBody: Record<string, string> = {
      passengerName,
      flightNumber: flightNumber.toUpperCase(),
      pnr: pnr.toUpperCase(),
      destination: destination.toUpperCase(),
    };
    if (phone && typeof phone === 'string') {
      proxyBody.phone = phone;
    }

    // Try bot service first
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const botServiceUrl = new URL('/baggage/generate', BOT_SERVICE_URL);
      const response = await fetch(botServiceUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proxyBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();

        // Store in database (non-blocking)
        storeBaggageQR(data, passengerName, flightNumber, pnr, destination, phone).catch(console.error);

        return NextResponse.json({
          ...data,
          _serviceAvailable: true,
        });
      }

      console.error(`Bot baggage generate error: ${response.status}`);
    } catch (fetchErr) {
      clearTimeout(timeoutId);

      if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
        console.error('Bot baggage generate timeout');
      } else {
        console.error('Failed to reach bot service for baggage generate:', fetchErr);
      }
    }

    // Fallback: Generate QR data locally
    const fallbackData = generateFallbackBaggageQR(
      passengerName,
      flightNumber.toUpperCase(),
      pnr.toUpperCase(),
      destination.toUpperCase(),
    );

    // Store in database (non-blocking)
    storeBaggageQR(fallbackData, passengerName, flightNumber, pnr, destination, phone).catch(console.error);

    return NextResponse.json({
      ...fallbackData,
      _serviceAvailable: false,
    });
  } catch (error) {
    console.error('Error in /api/bot/baggage/generate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Generate a fallback baggage QR locally when bot service is unavailable.
 */
function generateFallbackBaggageQR(
  passengerName: string,
  flightNumber: string,
  pnr: string,
  destination: string,
): Record<string, unknown> {
  // Generate a pseudo-random token
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  const qrToken = `BG-${timestamp}-${random}`.toUpperCase();

  // Generate tag number format: ABJ-1234567890
  const tagNumber = `ABJ-${Date.now().toString().slice(-10)}`;

  // Tracking URL
  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://maellis.ai'}/track/${qrToken}`;

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return {
    success: true,
    qrToken,
    tagNumber,
    trackingUrl,
    passengerName,
    flightNumber,
    pnr,
    destination,
    status: 'active',
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    scanCount: 0,
    lastScannedAt: null,
    fallback: true,
  };
}

/**
 * Store baggage QR record in database.
 */
async function storeBaggageQR(
  data: Record<string, unknown>,
  passengerName: string,
  flightNumber: string,
  pnr: string,
  destination: string,
  phone?: string,
) {
  try {
    await db.baggageQR.create({
      data: {
        id: `bq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        passengerName,
        phone: phone || (data.phone as string) || '',
        flightNumber: (data.flightNumber as string) || flightNumber,
        pnr: (data.pnr as string) || pnr,
        tagNumber: (data.tagNumber as string) || `TAG-${Date.now()}`,
        destination: (data.destination as string) || destination,
        qrToken: (data.qrToken as string) || `QR-${Date.now()}`,
        status: 'active',
        expiresAt: data.expiresAt
          ? new Date(data.expiresAt as string)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
    });
  } catch (dbError) {
    console.error('Failed to store baggage QR:', dbError);
  }
}
