import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [
      totalConversations,
      messagesToday,
      activeAlerts,
      paymentsToday,
      totalFlightSearches,
      totalLoungeBookings,
      totalTransportBookings,
    ] = await Promise.all([
      db.conversation.count(),
      db.message.count({
        where: { createdAt: { gte: todayStart } },
      }),
      db.emergencyAlert.count({
        where: { status: { in: ['open', 'in_progress'] } },
      }),
      db.payment.aggregate({
        where: {
          createdAt: { gte: todayStart },
          status: 'completed',
        },
        _sum: { amount: true },
      }),
      db.flightSearch.count(),
      db.loungeBooking.count(),
      db.transportBooking.count(),
    ])

    return NextResponse.json({
      totalConversations,
      messagesToday,
      activeAlerts,
      revenueToday: paymentsToday._sum.amount ?? 0,
      totalFlightSearches,
      totalLoungeBookings,
      totalTransportBookings,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
