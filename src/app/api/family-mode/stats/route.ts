import { NextRequest, NextResponse } from 'next/server';
import { getFamilyStats } from '@/lib/services/family-mode.service';
import { requireAuth } from '@/lib/auth';

// ---------------------------------------------------------------------------
// GET /api/family-mode/stats — Family mode activation stats (admin)
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const result = await getFamilyStats();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.stats,
    });
  } catch (error) {
    console.error('[GET /api/family-mode/stats] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
