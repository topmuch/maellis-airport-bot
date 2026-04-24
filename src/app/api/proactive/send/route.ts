import { NextRequest, NextResponse } from 'next/server';
import { sendProactiveMessage } from '@/lib/services/proactive.service';
import { requireRole } from '@/lib/auth';
import { parseBody, ValidationError } from '@/lib/validate'

// ---------------------------------------------------------------------------
// POST /api/proactive/send
// Body: { phone, flightNumber?, messageType, messageContent, triggeredBy }
// Create a ProactiveLog entry
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT')(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const body = await parseBody(request);
    const { phone, flightNumber, messageType, messageContent, triggeredBy } =
      body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { success: false, error: 'phone is required' },
        { status: 400 },
      );
    }

    if (!messageType || typeof messageType !== 'string') {
      return NextResponse.json(
        { success: false, error: 'messageType is required' },
        { status: 400 },
      );
    }

    if (!messageContent || typeof messageContent !== 'string') {
      return NextResponse.json(
        { success: false, error: 'messageContent is required' },
        { status: 400 },
      );
    }

    if (!triggeredBy || typeof triggeredBy !== 'string') {
      return NextResponse.json(
        { success: false, error: 'triggeredBy is required' },
        { status: 400 },
      );
    }

    const log = await sendProactiveMessage({
      phone,
      flightNumber: flightNumber || undefined,
      messageType,
      messageContent,
      triggeredBy,
    });

    return NextResponse.json({
      success: true,
      data: log,
    });
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    const message =
      error instanceof Error ? error.message : 'Internal server error';

    console.error('[POST /api/proactive/send] Error:', error);

    // Distinguish validation errors from server errors
    if (
      message.includes('required') ||
      message.includes('Invalid') ||
      message.includes('Must be one of')
    ) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
