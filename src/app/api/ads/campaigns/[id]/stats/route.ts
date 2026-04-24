import { NextRequest, NextResponse } from 'next/server';
import { getCampaignStats } from '@/lib/services/ad.service';
import { requireAuth } from '@/lib/auth';

// ---------------------------------------------------------------------------
// GET /api/ads/campaigns/[id]/stats — Campaign statistics
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
