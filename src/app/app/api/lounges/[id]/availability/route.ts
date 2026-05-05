import { NextRequest, NextResponse } from 'next/server';
import { checkAvailability } from '@/lib/services/lounge.service';
import { requireAuth } from '@/lib/auth';

// ---------------------------------------------------------------------------
// GET /api/lounges/[id]/availability?date=YYYY-MM-DD
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }

    const { id } = await params;

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameter: date' },
        { status: 400 },
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: 'date must be in YYYY-MM-DD format' },
        { status: 400 },
      );
    }

    const availability = await checkAvailability(id, date);

    return NextResponse.json({
      success: true,
      data: availability,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Lounge not found') {
        return NextResponse.json(
          { success: false, error: 'Lounge not found' },
          { status: 404 },
        );
      }
    }

    console.error('[GET /api/lounges/:id/availability] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
