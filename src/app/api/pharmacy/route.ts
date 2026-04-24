import { NextRequest, NextResponse } from 'next/server'
import {
  searchProducts,
  getPharmacyMerchants,
  createPharmacyOrder,
  getPharmacyOrders,
  getHealthStats,
} from '@/lib/services/health-pharmacy.service'

// GET /api/pharmacy - Search products, list merchants, list orders, or stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'action query parameter is required (search, merchants, orders, stats)' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'search': {
        const q = searchParams.get('q')
        const airportCode = searchParams.get('airportCode')

        if (!q) {
          return NextResponse.json(
            { success: false, error: 'q (search query) is required for search action' },
            { status: 400 }
          )
        }

        const products = await searchProducts(q, airportCode || 'DSS')
        return NextResponse.json({ success: true, data: products })
      }

      case 'merchants': {
        const airportCode = searchParams.get('airportCode')
        const merchants = await getPharmacyMerchants(airportCode || 'DSS')
        return NextResponse.json({ success: true, data: merchants })
      }

      case 'orders': {
        const phone = searchParams.get('phone')
        const status = searchParams.get('status')
        const orders = await getPharmacyOrders(phone || undefined, status || undefined)
        return NextResponse.json({ success: true, data: orders })
      }

      case 'stats': {
        const airportCode = searchParams.get('airportCode')
        const stats = await getHealthStats(airportCode || 'DSS')
        return NextResponse.json({ success: true, data: stats })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Must be one of: search, merchants, orders, stats' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in pharmacy GET handler:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process pharmacy request' },
      { status: 500 }
    )
  }
}

// POST /api/pharmacy - Create a pharmacy order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerName, customerPhone, items } = body

    if (!customerName || !customerPhone) {
      return NextResponse.json(
        { success: false, error: 'customerName and customerPhone are required' },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'items array with at least one item is required' },
        { status: 400 }
      )
    }

    const order = await createPharmacyOrder({
      airportCode: body.airportCode,
      customerName,
      customerPhone,
      flightNumber: body.flightNumber,
      gate: body.gate,
      urgency: body.urgency,
      items,
    })

    return NextResponse.json({ success: true, data: order }, { status: 201 })
  } catch (error) {
    console.error('Error creating pharmacy order:', error)
    const message = error instanceof Error ? error.message : 'Failed to create pharmacy order'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
