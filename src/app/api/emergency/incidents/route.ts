import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { sendEmergencyAlert } from '@/lib/email'
import { declareIncident, getIncidents } from '@/lib/services/emergency.service'

// GET /api/emergency/incidents?airport=DSS&status=open&severity=critical
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const airportCode = searchParams.get('airport') || undefined
    const status = searchParams.get('status') || undefined
    const severity = searchParams.get('severity') || undefined

    const incidents = await getIncidents(airportCode, status, severity)

    return NextResponse.json({ success: true, data: incidents })
  } catch (error) {
    console.error('Error fetching emergency incidents:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch emergency incidents' },
      { status: 500 }
    )
  }
}

// POST /api/emergency/incidents — Declare incident (no auth for bot usage)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      airportCode,
      userPhone,
      userEmail,
      userName,
      alertType,
      severity,
      location,
      description,
    } = body

    if (!airportCode || !userPhone || !alertType) {
      return NextResponse.json(
        { success: false, error: 'airportCode, userPhone, and alertType are required' },
        { status: 400 }
      )
    }

    if (!description) {
      return NextResponse.json(
        { success: false, error: 'description is required' },
        { status: 400 }
      )
    }

    // 1. Declare the incident and find the primary contact
    const { incident, primaryContact } = await declareIncident({
      airportCode,
      userPhone,
      userEmail: userEmail || undefined,
      userName: userName || undefined,
      alertType,
      severity: severity || undefined,
      location: location || undefined,
      description,
    })

    // 2. Send emergency alert email to the primary contact (fire-and-forget)
    if (primaryContact?.email) {
      try {
        await sendEmergencyAlert(primaryContact.email, {
          category: alertType,
          severity: severity || 'medium',
          location: location || 'Non spécifié',
          description,
          userName: userName || 'Anonyme',
          phone: userPhone,
        })
      } catch (emailError) {
        console.error('Failed to send emergency alert to primary contact:', emailError)
      }
    }

    // 3. Send admin notification email (fire-and-forget)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@maellis.com'
    try {
      await sendEmergencyAlert(adminEmail, {
        category: alertType,
        severity: severity || 'medium',
        location: location || 'Non spécifié',
        description,
        userName: userName || 'Anonyme',
        phone: userPhone,
      })
    } catch (emailError) {
      console.error('Failed to send emergency alert email to admin:', emailError)
    }

    // 4. Build reassurance message
    const reassuranceMessage = primaryContact
      ? `Votre alerte d'urgence a été enregistrée avec succès. Notre équipe de ${alertType} a été notifiée. ` +
        `Contact principal : ${primaryContact.name} — ${primaryContact.phoneNumber}. ` +
        `Restez en lieu sûr, de l'aide arrive.`
      : `Votre alerte d'urgence a été enregistrée avec succès. ` +
        `Les équipes compétentes ont été alertées. Restez en lieu sûr, de l'aide arrive.`

    return NextResponse.json(
      {
        success: true,
        data: {
          incident,
          primaryContact: primaryContact || null,
          message: reassuranceMessage,
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('Error declaring emergency incident:', error)

    const message = error instanceof Error ? error.message : 'Failed to declare emergency incident'

    if (message.startsWith('Invalid alert type') || message.startsWith('Invalid category')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to declare emergency incident' },
      { status: 500 }
    )
  }
}
