import { NextRequest, NextResponse } from 'next/server';
import { getProactiveLogs } from '@/lib/services/proactive.service';

// ---------------------------------------------------------------------------
// GET /api/proactive/logs?airportCode=xxx&type=xxx&phone=xxx&page=1&limit=20
// List proactive message logs with pagination and filters
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const airportCode = searchParams.get('airportCode') || undefined;
    const messageType = searchParams.get('type') || undefined;
    const phone = searchParams.get('phone') || undefined;
    const page = searchParams.get('page')
      ? parseInt(searchParams.get('page')!, 10)
      : undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : undefined;

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
