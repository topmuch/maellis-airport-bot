import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/flights/status - List flight statuses
export async function GET() {
  try {
    const statuses = await db.flightStatus.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: statuses })
  } catch (error) {
    console.error('Error fetching flight statuses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch flight statuses' },
      { status: 500 }
    )
  }
}
