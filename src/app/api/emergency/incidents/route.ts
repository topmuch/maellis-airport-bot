import { NextRequest, NextResponse } from 'next/server'
import { sendEmergencyAlert } from '@/lib/email'
import { declareIncident, getIncidents } from '@/lib/services/emergency.service'

// GET /api/emergency/incidents?status=open&severity=critical
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const severity = searchParams.get('severity') || undefined

    const incidents = await getIncidents(undefined, status, severity)

    return NextResponse.json({ data: incidents })
  } catch (error) {
    console.error('Error fetching emergency incidents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch emergency incidents' },
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
      userName,
      category,
      severity,
      location,
      description,
    } = body

    if (!airportCode || !userPhone || !category || !severity) {
      return NextResponse.json(
        { error: 'airportCode, userPhone, category, and severity are required' },
        { status: 400 }
      )
    }

    // 1. Declare the incident and find the primary contact
    const { incident, contact } = await declareIncident({
      airportCode,
      userPhone,
      userName: userName || undefined,
      category,
      severity,
      location: location || undefined,
      description: description || undefined,
    })

    // 2. Send emergency alert email to admin (fire-and-forget)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@maellis.com'
    try {
      await sendEmergencyAlert(adminEmail, {
        category,
        severity,
        location: location || 'Non spécifié',
        description: description || 'Non spécifié',
        userName: userName || 'Anonyme',
        phone: userPhone,
      })
    } catch (emailError) {
      console.error('Failed to send emergency alert email:', emailError)
      // Don't fail the request — the incident is still created
    }

    // 3. Build reassurance message
    const reassuranceMessage = contact
      ? `Votre alerte d'urgence a été enregistrée avec succès. Notre équipe de ${category} a été notifiée. ` +
        `Contact principal : ${contact.name} — ${contact.phoneNumber}. ` +
        `Restez en lieu sûr, de l'aide arrive.`
      : `Votre alerte d'urgence a été enregistrée avec succès. ` +
        `Les équipes compétentes ont été alertées. Restez en lieu sûr, de l'aide arrive.`

    return NextResponse.json(
      {
        data: {
          incident,
          contact: contact || null,
          message: reassuranceMessage,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error declaring emergency incident:', error)
    return NextResponse.json(
      { error: 'Failed to declare emergency incident' },
      { status: 500 }
    )
  }
}
