import { NextRequest, NextResponse } from 'next/server';
import { rejectAd } from '@/lib/services/ad.service';

// ---------------------------------------------------------------------------
// PUT /api/admin/ads/[id]/reject — Reject ad (pending → rejected)
// ---------------------------------------------------------------------------
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Ad ID is required' },
        { status: 400 },
      );
    }

    const body = await request.json();

    if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'A rejection reason is required' },
        { status: 400 },
      );
    }

    const ad = await rejectAd(id, body.reason.trim());

    if (!ad) {
      return NextResponse.json(
        { success: false, error: 'Advertisement not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: ad,
      message: 'Advertisement rejected',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('Cannot reject ad')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
    }
    console.error('[PUT /api/admin/ads/:id/reject] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
