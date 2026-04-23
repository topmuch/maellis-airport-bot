import { NextRequest, NextResponse } from 'next/server';
import { createReview, getReviews } from '@/lib/services/merchant.service';

// ---------------------------------------------------------------------------
// GET /api/merchants/[id]/reviews?rating=5
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: merchantId } = await params;

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'Merchant ID is required' },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const ratingParam = searchParams.get('rating');
    const rating = ratingParam ? parseInt(ratingParam, 10) : undefined;

    // Validate rating if provided
    if (rating !== undefined && (isNaN(rating) || rating < 1 || rating > 5)) {
      return NextResponse.json(
        { success: false, error: 'rating must be between 1 and 5' },
        { status: 400 },
      );
    }

    const reviews = await getReviews(merchantId, rating);

    return NextResponse.json({
      success: true,
      data: reviews,
      count: reviews.length,
    });
  } catch (error) {
    console.error(`[GET /api/merchants/:id/reviews] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/merchants/[id]/reviews — Create review
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: merchantId } = await params;

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'Merchant ID is required' },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields: string[] = ['customerName', 'customerPhone', 'rating'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate rating
    if (typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { success: false, error: 'rating must be a number between 1 and 5' },
        { status: 400 },
      );
    }

    const review = await createReview({
      merchantId,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      orderId: body.orderId,
      rating: body.rating,
      comment: body.comment,
      images: body.images,
    });

    return NextResponse.json(
      { success: true, data: review, message: 'Review created successfully' },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Merchant not found') {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 },
        );
      }
      if (error.message.includes('Rating must be between')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 },
        );
      }
    }

    console.error(`[POST /api/merchants/:id/reviews] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
