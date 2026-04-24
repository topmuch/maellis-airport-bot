import { NextRequest, NextResponse } from 'next/server';
import { updateTrack, deleteTrack, trackPlay } from '@/lib/services/music.service';

// PUT /api/music/tracks/[id] — update track
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const track = await updateTrack(id, body);
    return NextResponse.json({ success: true, data: track });
  } catch (error) {
    console.error('Error updating music track:', error);
    const message = error instanceof Error ? error.message : 'Failed to update track';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/music/tracks/[id] — delete track
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteTrack(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting music track:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete track';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/music/tracks/[id] — record a play (no body needed, just the track ID)
// This increments playCount for analytics
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userAgent = request.headers.get('user-agent') || undefined;
    const result = await trackPlay(id, userAgent);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error recording track play:', error);
    return NextResponse.json({ success: false, error: 'Failed to record play' }, { status: 500 });
  }
}
