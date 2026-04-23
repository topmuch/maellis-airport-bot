import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { respondToReview } from '@/lib/services/merchant.service';

// ---------------------------------------------------------------------------
// PUT /api/reviews/[id]/response — Respond to review (auth required)
// ---------------------------------------------------------------------------
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: authResult.status || 401 },
      );
    }

    const { id: reviewId } = await params;

    if (!reviewId) {
      return NextResponse.json(
        { success: false, error: 'Review ID is required' },
        { status: 400 },
      );
    }

    const body = await request.json();

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
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Authentication required') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 },
        );
      }
    }

    console.error(`[PUT /api/reviews/:id/response] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
