import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getProactiveRules } from '@/lib/services/proactive.service';
import { requireAuth, requireRole } from '@/lib/auth';
import { parseBody, ValidationError } from '@/lib/validate'

// ---------------------------------------------------------------------------
// GET /api/proactive/rules — Return all proactive rules with enabled state
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const rules = await getProactiveRules();

    return NextResponse.json({
      success: true,
      data: rules,
    });
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('[GET /api/proactive/rules] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/proactive/rules — Toggle a rule's enabled state
// Body: { ruleId: string, enabled: boolean }
// ---------------------------------------------------------------------------
export async function PUT(request: NextRequest) {
  const authResult = await requireRole('SUPERADMIN', 'AIRPORT_ADMIN')(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }

  try {
    const body = await parseBody(request);
    const { ruleId, enabled } = body;

    if (!ruleId || typeof ruleId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'ruleId is required and must be a string' },
        { status: 400 },
      );
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'enabled is required and must be a boolean' },
        { status: 400 },
      );
    }

    const validRuleIds = [
      'departure_reminder',
      'delay_alert',
      'gate_change',
    ];
    if (!validRuleIds.includes(ruleId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid ruleId. Must be one of: ${validRuleIds.join(', ')}`,
        },
        { status: 400 },
      );
    }

    // Upsert the setting in the Setting model
    const setting = await db.setting.upsert({
      where: { key: ruleId },
      update: { value: String(enabled) },
      create: {
        key: ruleId,
        value: String(enabled),
        type: 'boolean',
        group: 'proactive',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ruleId: setting.key,
        enabled: setting.value === 'true',
      },
    });
  } catch (error) {

    if (error instanceof ValidationError) {

      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    }

    console.error('[PUT /api/proactive/rules] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
