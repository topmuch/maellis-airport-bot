import { NextRequest, NextResponse } from 'next/server';
import { updateCategory, deleteCategory } from '@/lib/services/music.service';

// PUT /api/music/categories/[id] — update category
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const category = await updateCategory(id, body);
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error('Error updating music category:', error);
    const message = error instanceof Error ? error.message : 'Failed to update category';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/music/categories/[id] — delete category
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteCategory(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting music category:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete category';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
