import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { parseBody, ValidationError } from '@/lib/validate';
import {
  enableFamilyMode,
  disableFamilyMode,
} from '@/lib/services/family-mode.service';

// ---------------------------------------------------------------------------
// POST /api/family-mode/toggle — Enable or disable family mode
// Body: { phone, action: "enable" | "disable", data?: { childCount?, childAges?, infantCount? } }
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const body = await parseBody(request);
    const { phone, action, data } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid required field: phone' },
        { status: 400 },
      );
    }

    if (!action || !['enable', 'disable'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid required field: action (must be "enable" or "disable")' },
        { status: 400 },
      );
    }

    if (action === 'enable') {
      // Validate optional data fields
      if (data) {
        if (data.childCount !== undefined && (typeof data.childCount !== 'number' || data.childCount < 0)) {
          return NextResponse.json(
            { success: false, error: 'childCount must be a non-negative number' },
            { status: 400 },
          );
        }
        if (data.childAges !== undefined && !Array.isArray(data.childAges)) {
          return NextResponse.json(
            { success: false, error: 'childAges must be an array of numbers' },
            { status: 400 },
          );
        }
        if (data.childAges && data.childAges.some((age: unknown) => typeof age !== 'number' || age < 0)) {
          return NextResponse.json(
            { success: false, error: 'childAges must contain only non-negative numbers' },
            { status: 400 },
          );
        }
        if (data.infantCount !== undefined && (typeof data.infantCount !== 'number' || data.infantCount < 0)) {
          return NextResponse.json(
            { success: false, error: 'infantCount must be a non-negative number' },
            { status: 400 },
          );
        }
      }

      const result = await enableFamilyMode(phone, {
        childCount: data?.childCount,
        childAges: data?.childAges,
        infantCount: data?.infantCount,
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: { enabled: true, user: result.user },
      });
    }

    // action === 'disable'
    const result = await disableFamilyMode(phone);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { enabled: false, user: result.user },
    });
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('[POST /api/family-mode/toggle] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
