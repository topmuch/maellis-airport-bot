import { NextRequest, NextResponse } from 'next/server';
import { respondToReview } from '@/lib/services/merchant.service';
import { requireAuth } from '@/lib/auth';
import { validateId, ValidationError, parseBody } from '@/lib/validate';

// ---------------------------------------------------------------------------
// PUT /api/reviews/[id]/response — Respond to review
// ---------------------------------------------------------------------------
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const { id: reviewId } = await params;

    try {
      validateId(reviewId);
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode });
      }
      throw err;
    }

    const body = await parseBody(request);

    if (!body.response || typeof body.response !== 'string' || body.response.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'response is required and must be a non-empty string' },
        { status: 400 },
      );
    }

    const review = await respondToReview(reviewId, body.response.trim());

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: review,
      message: 'Review response submitted successfully',
    });
  } catch (error: unknown) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error(`[PUT /api/reviews/:id/response] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
