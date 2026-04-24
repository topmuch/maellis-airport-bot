import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getFamilyProfile } from '@/lib/services/family-mode.service';

// ---------------------------------------------------------------------------
// GET /api/family-mode/profile?phone=xxx — Get family profile for a user
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameter: phone' },
        { status: 400 },
      );
    }

    const result = await getFamilyProfile(phone);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.profile,
    });
  } catch (error) {
    console.error('[GET /api/family-mode/profile] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
