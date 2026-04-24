import { NextRequest, NextResponse } from 'next/server';
import { getCategories, getAllCategories, createCategory } from '@/lib/services/music.service';
import { requireAuth, requireRole } from '@/lib/auth';
import { parseBody, ValidationError } from '@/lib/validate'

// GET /api/music/categories — public (active categories) or admin (all with ?admin=true)
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const admin = searchParams.get('admin') === 'true';

    const data = admin ? await getAllCategories() : await getCategories();
    return NextResponse.json({ success: true, data });
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error fetching music categories:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST /api/music/categories — create a new category (admin)
export async function POST(request: NextRequest) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const body = await parseBody(request);
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json({ success: false, error: 'name and slug are required' }, { status: 400 });
    }

    const category = await createCategory(body);
    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error creating music category:', error);
    const message = error instanceof Error ? error.message : 'Failed to create category';
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
