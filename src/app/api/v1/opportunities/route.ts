// GET /api/v1/opportunities — Opportunity Radar
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { detectOpportunities, getActiveOpportunities } from '@/analytics/opportunities';

export async function GET() {
  try {
    // Optionally run detection
    await detectOpportunities();

    const opportunities = await getActiveOpportunities();

    return NextResponse.json({
      data: opportunities,
      summary: {
        total: opportunities.length,
        critical: opportunities.filter((o) => o.severity === 'CRITICAL').length,
        high: opportunities.filter((o) => o.severity === 'HIGH').length,
        medium: opportunities.filter((o) => o.severity === 'MEDIUM').length,
        low: opportunities.filter((o) => o.severity === 'LOW').length,
        total_estimated_revenue: opportunities.reduce((sum, o) => sum + o.estimated_incremental_revenue, 0),
      },
    });
  } catch (error) {
    console.error('Opportunities error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/v1/opportunities — Update opportunity status
export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const body = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'Missing opportunity ID' }, { status: 400 });
  }

  try {
    const update: Record<string, unknown> = { status: body.status };
    if (body.status === 'RESOLVED') {
      update.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('opportunities')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Update opportunity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

