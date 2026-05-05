import { NextRequest, NextResponse } from 'next/server';
import { getProactiveLogs } from '@/lib/services/proactive.service';
import { requireAuth } from '@/lib/auth';

// ---------------------------------------------------------------------------
// GET /api/proactive/logs?airportCode=xxx&type=xxx&phone=xxx&page=1&limit=20
// List proactive message logs with pagination and filters
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const airportCode = searchParams.get('airportCode') || undefined;
    const messageType = searchParams.get('type') || undefined;
    const phone = searchParams.get('phone') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 1));

    const result = await getProactiveLogs({
      airportCode,
      phone,
      messageType,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[GET /api/proactive/logs] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
