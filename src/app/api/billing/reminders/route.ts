import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { processReminders, checkOverdueInvoices } from '@/lib/services/billing.service'

// POST /api/billing/reminders — Process overdue reminders (admin action)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { action } = body

    if (action === 'check_overdue') {
      // Check for overdue invoices (mark them as overdue)
      const result = await checkOverdueInvoices()

      return NextResponse.json({
        success: true,
        data: result,
        message: `Marked ${result.count} invoice(s) as overdue`,
      })
    }

    // Default: process reminders for overdue invoices
    const result = await processReminders()

    return NextResponse.json({
      success: true,
      data: result,
      message: `Processed reminders: ${result.sent} sent, ${result.failed} failed`,
    })
  } catch (error) {
    console.error('Error processing reminders:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process reminders' },
      { status: 500 }
    )
  }
}
