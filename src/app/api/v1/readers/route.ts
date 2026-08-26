// GET /api/v1/readers — Reader List & Detail
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
  const offset = (page - 1) * limit;

  const subscriptionStatus = searchParams.get('subscription_status');
  const propensityMin = searchParams.get('propensity_min');
  const propensityMax = searchParams.get('propensity_max');
  const identityStatus = searchParams.get('identity_status');
  const search = searchParams.get('search');

  try {
    let query = supabaseAdmin
      .from('readers')
      .select(`
        *,
        features:reader_features(*)
      `, { count: 'exact' })
      .order('last_seen_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (subscriptionStatus) {
      query = query.eq('subscription_status', subscriptionStatus);
    }
    if (identityStatus) {
      query = query.eq('identity_status', identityStatus);
    }

    const { data: readers, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter by propensity if needed (can't do in query easily)
    let filtered = readers ?? [];
    if (propensityMin) {
      filtered = filtered.filter((r) => (r.features?.subscription_propensity ?? 0) >= parseInt(propensityMin));
    }
    if (propensityMax) {
      filtered = filtered.filter((r) => (r.features?.subscription_propensity ?? 0) <= parseInt(propensityMax));
    }

    return NextResponse.json({
      data: filtered,
      pagination: {
        page,
        limit,
        total: count ?? filtered.length,
        pages: Math.ceil((count ?? filtered.length) / limit),
      },
    });
  } catch (error) {
    console.error('Readers list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
