import { NextRequest, NextResponse } from 'next/server';
import { getCampaignStats } from '@/lib/services/ad.service';

// ---------------------------------------------------------------------------
// GET /api/ads/campaigns/[id]/stats — Campaign statistics
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Campaign ID is required' },
        { status: 400 },
      );
    }

    const stats = await getCampaignStats(id);

    if (!stats) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('[GET /api/ads/campaigns/:id/stats] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
