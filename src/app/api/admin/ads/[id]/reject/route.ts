import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { rejectAd } from '@/lib/services/ad.service';

// ---------------------------------------------------------------------------
// PUT /api/admin/ads/[id]/reject — Reject ad (pending → rejected)
// ---------------------------------------------------------------------------

/** Validate that the dynamic id segment is a valid identifier */
const idSchema = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ad ID format');

/** Validate the rejection request body */
const rejectBodySchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'A rejection reason is required')
    .max(1000, 'Rejection reason must not exceed 1000 characters'),
});

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

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Request body must be valid JSON' },
        { status: 400 },
      );
    }

    const bodyResult = rejectBodySchema.safeParse(body);
    if (!bodyResult.success) {
      return NextResponse.json(
        { success: false, error: bodyResult.error.issues[0].message },
        { status: 400 },
      );
    }

    const ad = await rejectAd(id, bodyResult.data.reason);

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
