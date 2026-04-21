import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const BOT_SERVICE_URL = 'http://localhost:3005';

/**
 * POST /api/bot/flight/search — Proxy to bot service for real flight search
 *
 * Accepts: { departureCode, arrivalCode, date?, passengers? }
 * Returns: Flight search results from bot service, with fallback mock data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { departureCode, arrivalCode, date, passengers } = body;

    if (!departureCode || !arrivalCode) {
      return NextResponse.json(
        { error: 'departureCode and arrivalCode are required' },
        { status: 400 },
      );
    }

    if (typeof departureCode !== 'string' || typeof arrivalCode !== 'string') {
      return NextResponse.json(
        { error: 'departureCode and arrivalCode must be strings' },
        { status: 400 },
      );
    }

    // Build proxy body
    const proxyBody: Record<string, unknown> = {
      departureCode: departureCode.toUpperCase(),
      arrivalCode: arrivalCode.toUpperCase(),
    };
    if (date) proxyBody.date = date;
    if (passengers && typeof passengers === 'number') proxyBody.passengers = passengers;

    // Try bot service first
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const botServiceUrl = new URL('/flight/search', BOT_SERVICE_URL);
      const response = await fetch(botServiceUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proxyBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();

        // Store the search in database (non-blocking)
        storeFlightSearch(departureCode.toUpperCase(), arrivalCode.toUpperCase(), date, passengers, data).catch(
          console.error,
        );

        return NextResponse.json({
          ...data,
          _serviceAvailable: true,
        });
      }

      // Bot service returned an error — use fallback
      console.error(`Bot flight search error: ${response.status}`);
    } catch (fetchErr) {
      clearTimeout(timeoutId);

      if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
        console.error('Bot flight search timeout');
      } else {
        console.error('Failed to reach bot service for flight search:', fetchErr);
      }
    }

    // Fallback mock data
    const fallbackData = getFallbackFlightSearch(departureCode.toUpperCase(), arrivalCode.toUpperCase(), date, passengers);

    // Store the search in database (non-blocking)
    storeFlightSearch(
      departureCode.toUpperCase(),
      arrivalCode.toUpperCase(),
      date,
      passengers,
      fallbackData,
    ).catch(console.error);

    return NextResponse.json({
      ...fallbackData,
      _serviceAvailable: false,
    });
  } catch (error) {
    console.error('Error in /api/bot/flight/search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Generate fallback mock flight search results.
 */
function getFallbackFlightSearch(
  departureCode: string,
  arrivalCode: string,
  date?: string,
  passengers?: number,
): Record<string, unknown> {
  const searchDate = date || new Date().toISOString().split('T')[0];
  const pax = passengers || 1;

  const airlines = ['Air Côte d\'Ivoire', 'Air France', 'Ethiopian Airlines', 'Royal Air Maroc', 'Turkish Airlines'];
  const departures = ['08:00', '10:30', '14:15', '18:45', '22:00'];
  const arrivals = ['11:30', '14:00', '17:45', '22:15', '01:30'];

  const results = airlines.map((airline, i) => {
    const basePrice = 150000 + Math.floor(Math.random() * 200000);
    return {
      airline,
      flightNumber: `${airline.charAt(0).toUpperCase()}${(100 + Math.floor(Math.random() * 900))}`,
      departureCode,
      arrivalCode,
      departureTime: departures[i],
      arrivalTime: arrivals[i],
      date: searchDate,
      duration: `${2 + Math.floor(Math.random() * 6)}h${Math.floor(Math.random() * 60).toString().padStart(2, '0')}m`,
      price: basePrice,
      pricePerPassenger: basePrice,
      totalPrice: basePrice * pax,
      passengers: pax,
      stops: Math.random() > 0.7 ? 1 : 0,
      availableSeats: 5 + Math.floor(Math.random() * 50),
      class: 'Economy',
    };
  });

  const cheapestPrice = Math.min(...results.map((r) => r.price as number));

  return {
    success: true,
    departureCode,
    arrivalCode,
    date: searchDate,
    passengers: pax,
    results,
    resultsCount: results.length,
    cheapestPrice,
    currency: 'XOF',
    fallback: true,
  };
}

/**
 * Store flight search in database.
 */
async function storeFlightSearch(
  departureCode: string,
  arrivalCode: string,
  date?: string,
  passengers?: number,
  responseData?: Record<string, unknown>,
) {
  try {
    await db.flightSearch.create({
      data: {
        departureCode,
        arrivalCode,
        departureCity: departureCode,
        arrivalCity: arrivalCode,
        travelDate: date || null,
        passengers: passengers || 1,
        resultsCount: (responseData?.resultsCount as number) || 0,
        cheapestPrice: (responseData?.cheapestPrice as number) || null,
        airline: null,
        status: responseData?.fallback ? 'fallback' : 'completed',
      },
    });
  } catch (dbError) {
    console.error('Failed to store flight search:', dbError);
  }
}
