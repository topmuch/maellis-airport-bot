import { NextRequest, NextResponse } from 'next/server';
import { getTracks, getAllTracks, createTrack, getMusicStats } from '@/lib/services/music.service';
import { requireAuth, requireRole } from '@/lib/auth';
import { parseBody, ValidationError } from '@/lib/validate'

// GET /api/music/tracks — public tracks (auth) or admin tracks/stats (admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId') || undefined;
    const admin = searchParams.get('admin') === 'true';
    const stats = searchParams.get('stats') === 'true';

    if (stats) {
      const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request);
      if (!authResult.success) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
      }
      const data = await getMusicStats();
      return NextResponse.json({ success: true, data });
    }

    if (admin) {
      const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request);
      if (!authResult.success) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
      }
      const data = await getAllTracks();
      return NextResponse.json({ success: true, data });
    }

    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const data = await getTracks(categoryId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error fetching music tracks:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tracks' }, { status: 500 });
  }
}

// POST /api/music/tracks — create a new track (admin)
export async function POST(request: NextRequest) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const body = await parseBody(request);
    const { categoryId, youtubeUrl } = body;

    if (!categoryId || !youtubeUrl) {
      return NextResponse.json({ success: false, error: 'categoryId and youtubeUrl are required' }, { status: 400 });
    }

    const track = await createTrack(body);
    return NextResponse.json({ success: true, data: track }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error creating music track:', error);
    const message = error instanceof Error ? error.message : 'Failed to create track';
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
