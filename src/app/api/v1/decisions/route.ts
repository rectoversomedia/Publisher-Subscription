// GET /api/v1/decisions — Decision List
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  try {
    const { data, error, count } = await supabaseAdmin
      .from('decisions')
      .select(`
        *,
        readers!inner(anonymous_id, external_user_id, subscription_status)
      `, { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? [],
      pagination: {
        total: count ?? 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Decisions list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
