import { NextRequest, NextResponse } from 'next/server'
import {
  getAudioHistory,
  generateAudio,
} from '@/lib/services/pmr-audio.service'

// GET /api/pmr-audio - List audio generation history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')

    const history = await getAudioHistory(phone || undefined)

    return NextResponse.json({ success: true, data: history })
  } catch (error) {
    console.error('Error fetching audio history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audio history' },
      { status: 500 }
    )
  }
}

// POST /api/pmr-audio - Generate audio
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, type } = body

    if (!text || !type) {
      return NextResponse.json(
        { success: false, error: 'text and type are required' },
        { status: 400 }
      )
    }

    const validTypes = ['navigation', 'announcement', 'gate_info', 'emergency', 'general']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const audio = await generateAudio({
      text,
      type,
      language: body.language,
      phone: body.phone,
    })

    return NextResponse.json({ success: true, data: audio }, { status: 201 })
  } catch (error) {
    console.error('Error generating audio:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate audio'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
