import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

// ─── Zod Schema (mirrors the client-side schema) ──────────────────────────

const contactSchema = z.object({
  name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  email: z.string().email('Veuillez entrer une adresse email valide'),
  subject: z.enum(['Partenariat', 'Support Technique', 'Commercial', 'Presse', 'Autre'], {
    error: 'Veuillez sélectionner un sujet',
  }),
  message: z
    .string()
    .min(10, 'Le message doit contenir au moins 10 caractères')
    .max(2000, 'Le message ne peut pas dépasser 2000 caractères'),
  consent: z.literal(true, {
    error: 'Vous devez accepter la politique de confidentialité',
  }),
})

type ContactPayload = z.infer<typeof contactSchema>

// ─── POST /api/contact ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const rateCheck = rateLimit(`contact:${ip}`, {
      maxRequests: 5,
      windowSeconds: 60,
    })

    if (!rateCheck.success) {
      return NextResponse.json(
        { success: false, error: 'Trop de requêtes. Veuillez réessayer dans un instant.' },
        { status: 429 }
      )
    }

    // Parse body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Corps de la requête invalide. JSON attendu.' },
        { status: 400 }
      )
    }

    // Validate with Zod
    const parsed = contactSchema.safeParse(body)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return NextResponse.json(
        { success: false, error: firstIssue?.message ?? 'Données invalides' },
        { status: 400 }
      )
    }

    const data: ContactPayload = parsed.data

    // In production: send email via nodemailer or store in DB
    console.log('[POST /api/contact] New message received:', {
      name: data.name,
      email: data.email,
      subject: data.subject,
      messageLength: data.message.length,
      timestamp: new Date().toISOString(),
    })

    // Mock response — in production, send email / store in DB here
    return NextResponse.json(
      { success: true, message: 'Message envoyé avec succès' },
      { status: 200 }
    )
  } catch (error) {
    console.error('[POST /api/contact] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
