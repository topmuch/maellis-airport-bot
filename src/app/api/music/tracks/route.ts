import { NextRequest, NextResponse } from 'next/server';
import { getTracks, getAllTracks, createTrack, getMusicStats } from '@/lib/services/music.service';

// GET /api/music/tracks — public tracks (with optional ?categoryId=) or admin (?admin=true or ?stats=true)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId') || undefined;
    const admin = searchParams.get('admin') === 'true';
    const stats = searchParams.get('stats') === 'true';

    if (stats) {
      const data = await getMusicStats();
      return NextResponse.json({ success: true, data });
    }

    const data = admin ? await getAllTracks() : await getTracks(categoryId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching music tracks:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tracks' }, { status: 500 });
  }
}

// POST /api/music/tracks — create a new track (admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categoryId, youtubeUrl } = body;

    if (!categoryId || !youtubeUrl) {
      return NextResponse.json({ success: false, error: 'categoryId and youtubeUrl are required' }, { status: 400 });
    }

    const track = await createTrack(body);
    return NextResponse.json({ success: true, data: track }, { status: 201 });
  } catch (error) {
    console.error('Error creating music track:', error);
    const message = error instanceof Error ? error.message : 'Failed to create track';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
