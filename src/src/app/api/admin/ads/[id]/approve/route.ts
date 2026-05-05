import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { approveAd } from '@/lib/services/ad.service';

// ---------------------------------------------------------------------------
// PUT /api/admin/ads/[id]/approve — Approve ad (pending → active)
// ---------------------------------------------------------------------------

/** Validate that the dynamic id segment is a valid UUID or MongoDB ObjectId */
const idSchema = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ad ID format');

const requireAdmin = requireRole('SUPERADMIN', 'AIRPORT_ADMIN');

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ── Auth & role check (defense-in-depth) ──
    const user = await requireAdmin(request);
    if (!user.success) {
      return NextResponse.json(
        { success: false, error: user.error },
        { status: user.status },
      );
    }

    const { id } = await params;

    // Validate id parameter
    const idResult = idSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid ad ID format' },
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
