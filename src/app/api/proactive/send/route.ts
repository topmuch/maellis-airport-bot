import { NextRequest, NextResponse } from 'next/server';
import { sendProactiveMessage } from '@/lib/services/proactive.service';

// ---------------------------------------------------------------------------
// POST /api/proactive/send
// Body: { phone, flightNumber?, messageType, messageContent, triggeredBy }
// Create a ProactiveLog entry
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
