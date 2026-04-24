import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import {
  getBillingSettings,
  updateBillingSettings,
} from '@/lib/services/billing.service'

// ─────────────────────────────────────────────
// CSRF / Content-Type guard
// ─────────────────────────────────────────────

function hasJsonContentType(request: NextRequest): boolean {
  const ct = request.headers.get('content-type') ?? ''
  return ct.includes('application/json')
}

// ─────────────────────────────────────────────
// Input validation schema for PUT body
// ─────────────────────────────────────────────

const updateBillingSettingsSchema = z.object({
  defaultTaxRate: z
    .number()
    .min(0, 'Tax rate cannot be negative')
    .max(1, 'Tax rate cannot exceed 100%')
    .optional(),
  gracePeriodDays: z
    .number()
    .int()
    .min(0, 'Grace period cannot be negative')
    .max(365, 'Grace period cannot exceed 365 days')
    .optional(),
  reminderDays: z
    .array(z.number().int().min(1, 'Reminder day must be positive').max(365))
    .max(20, 'Too many reminder days configured')
    .optional(),
  legalName: z
    .string()
    .min(1, 'Legal name cannot be empty')
    .max(200, 'Legal name too long')
    .optional(),
  legalAddress: z
    .string()
    .max(500, 'Legal address too long')
    .optional(),
  legalTaxId: z
    .string()
    .max(50, 'Tax ID too long')
    .optional(),
  legalRccm: z
    .string()
    .max(50, 'RCCM too long')
    .optional(),
  bankName: z
    .string()
    .max(200, 'Bank name too long')
    .optional(),
  bankAccount: z
    .string()
    .max(100, 'Bank account number too long')
    .optional(),
  paymentLink: z
    .string()
    .url('Must be a valid URL')
    .max(500, 'Payment link too long')
    .optional()
    .or(z.literal('')),
})
.strict() // Reject unknown fields

// GET /api/billing/settings — Get billing settings (admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const settings = await getBillingSettings()

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error('Error fetching billing settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch billing settings' },
      { status: 500 }
    )
  }
}

// PUT /api/billing/settings — Update billing settings (admin only)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireRole('superadmin', 'airport_admin')(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    // ── Content-Type guard (CSRF protection) ──
    if (!hasJsonContentType(request)) {
      return NextResponse.json(
        { success: false, error: 'Content-Type must be application/json' },
        { status: 415 }
      )
    }

    const body = await request.json()

    // ── Zod validation ──
    const parsed = updateBillingSettingsSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return NextResponse.json(
        {
          success: false,
          error: firstError?.message ?? 'Validation failed',
          details: parsed.error.issues,
        },
        { status: 400 }
      )
    }

    const settings = await updateBillingSettings(parsed.data)

    return NextResponse.json({
      success: true,
      data: settings,
      message: 'Billing settings updated successfully',
    })
  } catch (error) {
    console.error('Error updating billing settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update billing settings' },
      { status: 500 }
    )
  }
}
