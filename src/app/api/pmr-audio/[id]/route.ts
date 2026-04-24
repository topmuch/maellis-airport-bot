import { NextRequest, NextResponse } from 'next/server'
import { getAudioById, deleteAudio } from '@/lib/services/pmr-audio.service'
import { requireAuth } from '@/lib/auth'

// GET /api/pmr-audio/[id] - Get a single audio generation
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    const audio = await getAudioById(id)

    if (!audio) {
      return NextResponse.json(
        { success: false, error: 'Audio not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: audio })
  } catch (error) {
    console.error('Error fetching audio:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audio' },
      { status: 500 }
    )
  }
}

// DELETE /api/pmr-audio/[id] - Delete an audio generation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
  }

  try {
    const { id } = await params

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 })
    }

    const result = await deleteAudio(id)

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Audio not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error deleting audio:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete audio' },
      { status: 500 }
    )
  }
}
