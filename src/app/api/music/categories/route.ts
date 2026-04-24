import { NextRequest, NextResponse } from 'next/server';
import { getCategories, getAllCategories, createCategory } from '@/lib/services/music.service';

// GET /api/music/categories — public (active categories) or admin (all with ?admin=true)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const admin = searchParams.get('admin') === 'true';

    const data = admin ? await getAllCategories() : await getCategories();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching music categories:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST /api/music/categories — create a new category (admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json({ success: false, error: 'name and slug are required' }, { status: 400 });
    }

    const category = await createCategory(body);
    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    console.error('Error creating music category:', error);
    const message = error instanceof Error ? error.message : 'Failed to create category';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
