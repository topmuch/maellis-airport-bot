import { NextRequest, NextResponse } from 'next/server';
import { updateTrack, deleteTrack, trackPlay } from '@/lib/services/music.service';
import { requireRole, requireAuth } from '@/lib/auth';
import { parseBody, ValidationError } from '@/lib/validate'

// PUT /api/music/tracks/[id] — update track
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const { id } = await params;

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const body = await parseBody(request);
    const track = await updateTrack(id, body);
    return NextResponse.json({ success: true, data: track });
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error updating music track:', error);
    return NextResponse.json({ success: false, error: 'Failed to update track' }, { status: 500 });
  }
}

// DELETE /api/music/tracks/[id] — delete track
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const { id } = await params;

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    await deleteTrack(id);
    return NextResponse.json({ success: true });
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error deleting music track:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete track' }, { status: 500 });
  }
}

// POST /api/music/tracks/[id] — record a play (no body needed, just the track ID)
// This increments playCount for analytics
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') || undefined;
    const result = await trackPlay(id, userAgent);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error recording track play:', error);
    return NextResponse.json({ success: false, error: 'Failed to record play' }, { status: 500 });
  }
}
