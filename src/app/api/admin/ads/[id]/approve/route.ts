import { NextRequest, NextResponse } from 'next/server';
import { approveAd } from '@/lib/services/ad.service';

// ---------------------------------------------------------------------------
// PUT /api/admin/ads/[id]/approve — Approve ad (pending → active)
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

    const ad = await approveAd(id);

    if (!ad) {
      return NextResponse.json(
        { success: false, error: 'Advertisement not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: ad,
      message: `Advertisement ${ad.status === 'active' ? 'approved and activated' : ad.status === 'completed' ? 'approved but campaign has ended' : 'approved (not yet started)'}`,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('Cannot approve ad')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
    }
    console.error('[PUT /api/admin/ads/:id/approve] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
