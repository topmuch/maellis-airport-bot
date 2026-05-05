import { NextRequest, NextResponse } from 'next/server';
import { submitFeedback, getFeedbacks } from '@/lib/services/feedback.service';
import { requireAuth } from '@/lib/auth';
import { parseBody, ValidationError } from '@/lib/validate'

// ---------------------------------------------------------------------------
// GET /api/feedback?airportCode=xxx&rating=xxx&category=xxx&startDate=xxx&endDate=xxx&page=1&limit=20
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);

    const filters = {
      airportCode: searchParams.get('airportCode') || undefined,
      rating: searchParams.get('rating')
        ? parseInt(searchParams.get('rating')!, 10)
        : undefined,
      category: searchParams.get('category') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 1)),
    };

    // Validate rating if provided
    if (filters.rating !== undefined && (filters.rating < 1 || filters.rating > 5)) {
      return NextResponse.json(
        { success: false, error: 'Rating filter must be between 1 and 5' },
        { status: 400 },
      );
    }

    const result = await getFeedbacks(filters);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('[GET /api/feedback] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/feedback — Submit feedback
// Body: { phone, userName?, flightNumber?, airportCode?, rating, category?, comment? }
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const body = await parseBody(request);

    // Validate required fields
    const requiredFields: string[] = ['phone', 'rating'];
    const missingFields = requiredFields.filter((field) => body[field] === undefined || body[field] === null);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate phone format
    if (typeof body.phone !== 'string' || body.phone.trim().length < 6) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number' },
        { status: 400 },
      );
    }

    // Validate rating type
    if (typeof body.rating !== 'number' || !Number.isInteger(body.rating)) {
      return NextResponse.json(
        { success: false, error: 'Rating must be an integer between 1 and 5' },
        { status: 400 },
      );
    }

    const feedback = await submitFeedback({
      phone: body.phone.trim(),
      userName: body.userName || undefined,
      flightNumber: body.flightNumber || undefined,
      airportCode: body.airportCode || undefined,
      rating: body.rating,
      category: body.category || undefined,
      comment: body.comment || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        data: feedback,
        message: 'Feedback submitted successfully',
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      const message = error.message;

      if (message.includes('Rating must be')) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 400 },
        );
      }

      if (message.includes('Invalid category') || message.includes('Phone number')) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 400 },
        );
      }
    }

    console.error('[POST /api/feedback] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
