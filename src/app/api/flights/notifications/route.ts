import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/flights/notifications?unread=true&limit=20
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')
    const flightNumber = searchParams.get('flightNumber')

    const where: Record<string, unknown> = {}

    if (unreadOnly) {
      where.isRead = false
    }

    if (flightNumber) {
      where.flightNumber = flightNumber.toUpperCase().trim()
    }

    const notifications = await db.flightNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const unreadCount = await db.flightNotification.count({
      where: { isRead: false },
    })

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount,
      count: notifications.length,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}
