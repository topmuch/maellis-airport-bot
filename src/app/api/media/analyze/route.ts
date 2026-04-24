// ─────────────────────────────────────────────────────────────────────────────
// MAELLIS Airport Bot — API Route: POST /api/media/analyze
// Receives image (base64 or URL) and extracts boarding pass data via OCR
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { analyzeImage } from '@/lib/services/ocr.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageData, phone, source } = body

    if (!imageData) {
      return NextResponse.json(
        { success: false, message: 'Le champ "imageData" est requis (base64 ou URL).' },
        { status: 400 },
      )
    }

    if (!phone) {
      return NextResponse.json(
        { success: false, message: 'Le champ "phone" est requis.' },
        { status: 400 },
      )
    }

    // Validate phone format (simple check)
    const cleanedPhone = String(phone).replace(/[^0-9+]/g, '')
    if (cleanedPhone.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Format de numéro de téléphone invalide.' },
        { status: 400 },
      )
    }

    const result = await analyzeImage({
      imageData,
      phone: cleanedPhone,
      source: source || 'api',
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('[api/media/analyze] Error:', error)
    return NextResponse.json(
      {
        success: false,
        message: "Erreur interne du serveur lors de l'analyse de l'image.",
      },
      { status: 500 },
    )
  }
}

// Health check for OCR service
export async function GET() {
  const provider = process.env.OCR_PROVIDER || 'mock'
  const googleConfigured = !!process.env.GOOGLE_VISION_API_KEY

  return NextResponse.json({
    service: 'ocr',
    status: 'active',
    provider,
    googleVisionConfigured: googleConfigured,
    supportedProviders: ['mock', 'tesseract', 'google'],
    capabilities: [
      'boarding_pass_ocr',
      'pnr_extraction',
      'flight_number_extraction',
      'date_extraction',
      'airport_code_extraction',
      'airline_detection',
      'passenger_name_extraction',
    ],
  })
}
