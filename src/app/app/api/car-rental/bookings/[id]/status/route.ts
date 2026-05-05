import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { updateBookingStatus } from '@/lib/services/car-rental.service'
import { parseBody, ValidationError } from '@/lib/validate'
import { getWhatsAppMessageForStatus, type WhatsAppDispatchPayload, type CarRentalStatus } from '@/lib/car-rental-whatsapp.service'
import { metaRequest, getExternalConfig } from '@/lib/external-api-client'

/**
 * Send a WhatsApp text message to a customer phone number.
 * Uses the Meta Graph API proxy (metaRequest) with fire-and-forget semantics.
 * Returns nothing — errors are logged but never thrown (non-blocking).
 */
async function sendWhatsAppNotification(to: string, text: string): Promise<void> {
  if (!to || !text) return

  // Normalize phone number: ensure it starts with country code
  let phone = to.replace(/\s/g, '').replace(/[-()]/g, '')
  if (phone.startsWith('0') && phone.length === 10) {
    phone = '221' + phone.slice(1) // Senegal default
  }
  if (!phone.startsWith('+')) {
    phone = '+' + phone
  }

  try {
    const config = await getExternalConfig()
    if (!config.metaPhoneNumberId || !config.metaAccessToken) {
      console.warn('[car-rental] WhatsApp not configured (missing phoneNumberId or accessToken), skipping notification')
      return
    }

    const endpoint = `/v18.0/${config.metaPhoneNumberId}/messages`
    const result = await metaRequest(endpoint, {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: text, preview_url: false },
    })

    if (!result.ok) {
      console.error('[car-rental] WhatsApp send failed:', result.status, result.data)
    } else {
      console.log('[car-rental] WhatsApp notification sent to', phone, 'for status change')
    }
  } catch (err) {
    // Never throw — WhatsApp dispatch is non-blocking
    console.error('[car-rental] WhatsApp dispatch error (non-blocking):', err)
  }
}

// PUT /api/car-rental/bookings/[id]/status — Update booking status manually
// After status change, dispatches a WhatsApp notification to the customer.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const checkRole = requireRole('SUPERADMIN', 'AIRPORT_ADMIN')
    const authResult = await checkRole(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication required' },
        { status: authResult.status || 401 }
      )
    }

    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    const body = await parseBody(request)

    if (!body.status) {
      return NextResponse.json(
        { success: false, error: 'status is required (confirmed, active, completed, cancelled)' },
        { status: 400 }
      )
    }

    const booking = await updateBookingStatus(id, body.status)

    // ── WhatsApp notification dispatch (fire-and-forget) ──
    try {
      const targetStatus = body.status as CarRentalStatus
      const b = booking as Record<string, unknown>
      const v = b.vehicle as Record<string, unknown> | undefined
      const partnerData = (b.partner || v?.partner) as { name?: string; phone?: string; terminal?: string } | undefined

      const dispatchPayload: WhatsAppDispatchPayload = {
        status: targetStatus,
        booking: {
          confirmationCode: (b.confirmationCode as string) || '',
          userName: (b.userName as string | null) || (b.customerName as string | null) || null,
          userPhone: (b.userPhone as string) || (b.customerPhone as string) || '',
          vehicle: {
            brand: (v?.brand as string) || '',
            model: (v?.model as string) || '',
            category: (v?.category as string) || '',
          },
          pickupDate: (b.pickupDate as Date | string) || '',
          dropoffDate: (b.dropoffDate as Date | string) || '',
          pickupLocation: (b.pickupLocation as string) || '',
          totalPrice: (b.totalPrice as number) || 0,
          currency: (b.currency as string) || 'XOF',
          insurance: (b.insurance as boolean) || false,
          childSeat: (b.childSeat as boolean) || false,
        },
        partnerName: partnerData?.name,
        partnerPhone: partnerData?.phone,
        partnerTerminal: partnerData?.terminal,
      }

      const message = getWhatsAppMessageForStatus(dispatchPayload)
      if (message && dispatchPayload.booking.userPhone) {
        // Fire-and-forget: send WhatsApp notification (never blocks the status update response)
        sendWhatsAppNotification(dispatchPayload.booking.userPhone, message)
      }
    } catch (waError) {
      // WhatsApp dispatch is non-blocking — never fail the status update
      console.error('[car-rental] WhatsApp dispatch failed (non-blocking):', waError)
    }

    return NextResponse.json({ success: true, data: booking })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    const message = error instanceof Error ? error.message : 'Failed to update booking status'
    const statusCode = message.includes('not found') ? 404
      : message.includes('Validation failed') ? 400
      : message.includes('Invalid') ? 400
      : 500
    console.error('[car-rental] Error updating booking status:', error)
    return NextResponse.json({ success: false, error: message }, { status: statusCode })
  }
}
