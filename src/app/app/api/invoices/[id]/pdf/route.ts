import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { generateInvoicePDF } from '@/lib/services/billing.service'

// GET /api/invoices/:id/pdf — Download invoice PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    const pdfResult = await generateInvoicePDF(id)

    if (!pdfResult) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found or could not generate PDF' },
        { status: 404 }
      )
    }

    return new NextResponse(new Uint8Array(pdfResult.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="FAC-${pdfResult.invoiceNumber}.pdf"`,
        'Content-Length': pdfResult.buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate invoice PDF' },
      { status: 500 }
    )
  }
}
