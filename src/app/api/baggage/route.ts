import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/baggage - List baggage QR codes
export async function GET() {
  try {
    const baggageList = await db.baggageQR.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: baggageList })
  } catch (error) {
    console.error('Error fetching baggage QR codes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch baggage QR codes' },
      { status: 500 }
    )
  }
}

// POST /api/baggage - Create new baggage QR code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      passengerName,
      flightNumber,
      pnr,
      tagNumber,
      weight,
      destination,
      qrToken,
      status,
      expiresAt,
    } = body

    if (!passengerName || !flightNumber || !pnr || !tagNumber || !destination || !qrToken) {
      return NextResponse.json(
        { error: 'passengerName, flightNumber, pnr, tagNumber, destination, and qrToken are required' },
        { status: 400 }
      )
    }

    const baggageQR = await db.baggageQR.create({
      data: {
        passengerName,
        flightNumber,
        pnr,
        tagNumber,
        weight: weight ?? null,
        destination,
        qrToken,
        status: status || 'active',
        expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    return NextResponse.json(baggageQR, { status: 201 })
  } catch (error) {
    console.error('Error creating baggage QR code:', error)
    return NextResponse.json(
      { error: 'Failed to create baggage QR code' },
      { status: 500 }
    )
  }
}
