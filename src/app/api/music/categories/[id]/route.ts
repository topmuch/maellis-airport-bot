import { NextRequest, NextResponse } from 'next/server';
import { updateCategory, deleteCategory } from '@/lib/services/music.service';
import { requireRole } from '@/lib/auth';
import { parseBody, ValidationError } from '@/lib/validate'

// PUT /api/music/categories/[id] — update category
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const { id } = await params;

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const body = await parseBody(request);
    const category = await updateCategory(id, body);
    return NextResponse.json({ success: true, data: category });
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error updating music category:', error);
    return NextResponse.json({ success: false, error: 'Failed to update category' }, { status: 500 });
  }
}

// DELETE /api/music/categories/[id] — delete category
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const { id } = await params;

    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    await deleteCategory(id);
    return NextResponse.json({ success: true });
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('Error deleting music category:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete category' }, { status: 500 });
  }
}
