import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const BOT_SERVICE_URL = 'http://localhost:3005';

/**
 * GET /api/bot/flight/status — Proxy to bot service for real flight status
 *
 * Query params: ?number=2S221
 * Returns: Flight status information from bot service, with fallback mock data
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const flightNumber = searchParams.get('number');

    if (!flightNumber) {
      return NextResponse.json(
        { error: 'Query parameter "number" is required (e.g., ?number=2S221)' },
        { status: 400 },
      );
    }

    // Try bot service first
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const botServiceUrl = new URL(`/flight/status/${encodeURIComponent(flightNumber)}`, BOT_SERVICE_URL);
      const response = await fetch(botServiceUrl.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();

        // Store in database (non-blocking)
        storeFlightStatus(flightNumber, data).catch(console.error);

        return NextResponse.json({
          ...data,
          _serviceAvailable: true,
        });
      }

      console.error(`Bot flight status error: ${response.status}`);
    } catch (fetchErr) {
      clearTimeout(timeoutId);

      if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
        console.error('Bot flight status timeout');
      } else {
        console.error('Failed to reach bot service for flight status:', fetchErr);
      }
    }

    // Fallback mock data
    const fallbackData = getFallbackFlightStatus(flightNumber);

    // Store in database (non-blocking)
    storeFlightStatus(flightNumber, fallbackData).catch(console.error);

    return NextResponse.json({
      ...fallbackData,
      _serviceAvailable: false,
    });
  } catch (error) {
    console.error('Error in /api/bot/flight/status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Generate fallback mock flight status data.
 */
function getFallbackFlightStatus(flightNumber: string): Record<string, unknown> {
  const statuses = ['scheduled', 'boarding', 'departed', 'in_flight', 'arrived', 'delayed', 'cancelled'];
  const status = statuses[Math.floor(Math.random() * 3)]; // Mostly scheduled/boarding/departed
  const delayMinutes = status === 'delayed' ? 15 + Math.floor(Math.random() * 120) : 0;

  const now = new Date();
  const scheduledDep = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago
  const scheduledArr = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3h from now
  const actualDep = status === 'departed' || status === 'in_flight'
    ? new Date(scheduledDep.getTime() + delayMinutes * 60 * 1000)
    : null;

  const airline = flightNumber.startsWith('2S')
    ? 'Air Côte d\'Ivoire'
    : flightNumber.startsWith('AF')
      ? 'Air France'
      : 'Unknown Airline';

  return {
    success: true,
    flightNumber: flightNumber.toUpperCase(),
    airline,
    departureCode: 'ABJ',
    arrivalCode: 'CDG',
    departureCity: 'Abidjan',
    arrivalCity: 'Paris',
    scheduledDep: scheduledDep.toISOString(),
    scheduledArr: scheduledArr.toISOString(),
    actualDep: actualDep?.toISOString() || null,
    actualArr: null,
    gate: `${1 + Math.floor(Math.random() * 30)}`,
    terminal: 'A',
    status,
    delayMinutes,
    aircraft: 'Boeing 737-800',
    fallback: true,
  };
}

/**
 * Store flight status in database.
 */
async function storeFlightStatus(
  flightNumber: string,
  responseData: Record<string, unknown>,
) {
  try {
    await db.flightStatus.upsert({
      where: {
        id: `status-${flightNumber}`,
      },
      create: {
        id: `status-${flightNumber}`,
        flightNumber: (responseData.flightNumber as string) || flightNumber,
        airline: (responseData.airline as string) || 'Unknown',
        departureCode: (responseData.departureCode as string) || '',
        arrivalCode: (responseData.arrivalCode as string) || '',
        scheduledDep: (responseData.scheduledDep as string) || null,
        scheduledArr: (responseData.scheduledArr as string) || null,
        actualDep: (responseData.actualDep as string) || null,
        actualArr: (responseData.actualArr as string) || null,
        gate: (responseData.gate as string) || null,
        terminal: (responseData.terminal as string) || null,
        status: (responseData.status as string) || 'unknown',
        delayMinutes: (responseData.delayMinutes as number) || 0,
      },
      update: {
        scheduledDep: (responseData.scheduledDep as string) || null,
        scheduledArr: (responseData.scheduledArr as string) || null,
        actualDep: (responseData.actualDep as string) || null,
        actualArr: (responseData.actualArr as string) || null,
        gate: (responseData.gate as string) || null,
        status: (responseData.status as string) || 'unknown',
        delayMinutes: (responseData.delayMinutes as number) || 0,
      },
    });
  } catch (dbError) {
    console.error('Failed to store flight status:', dbError);
  }
}
