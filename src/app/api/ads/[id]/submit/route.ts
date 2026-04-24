import { NextRequest, NextResponse } from 'next/server';
import { submitForReview } from '@/lib/services/ad.service';
import { requireAuth } from '@/lib/auth';

// ---------------------------------------------------------------------------
// POST /api/ads/[id]/submit — Submit ad for review (draft → pending)
// ---------------------------------------------------------------------------
export async function POST(
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

    const ad = await submitForReview(id);

    if (!ad) {
      return NextResponse.json(
        { success: false, error: 'Advertisement not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: ad,
      message: 'Advertisement submitted for review',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('Cannot submit ad for review')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
    }
    console.error('[POST /api/ads/:id/submit] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
