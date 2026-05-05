import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getInvoices, generateInvoiceCSV } from '@/lib/services/billing.service'

// GET /api/invoices/export — Export invoices as CSV
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId') || undefined
    const status = searchParams.get('status') || undefined
    const type = searchParams.get('type') || undefined
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined

    // Fetch invoices (no pagination — export all matching)
    const result = await getInvoices({
      clientId,
      status,
      type,
      dateFrom,
      dateTo,
      page: 1,
      limit: 10000,
    })

    // Generate CSV content — getInvoices returns { invoices, pagination, summary }
    const invoices = result.invoices || []
    const csvContent = generateInvoiceCSV(invoices)

    // BOM prefix for Excel compatibility
    const BOM = '\uFEFF'

    return new NextResponse(BOM + csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="invoices-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting invoices:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to export invoices' },
      { status: 500 }
    )
  }
}
