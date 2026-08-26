// GET/PUT /api/config
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_config')
      .select('key, value');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const configMap: Record<string, { key: string; value: unknown }> = {};
    for (const row of data ?? []) {
      configMap[row.key] = row;
    }

    return NextResponse.json({ data: configMap });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('system_config')
      .update({ value })
      .eq('key', key)
      .select()
      .single();

    if (error) {
      // Insert if not exists
      const { data: inserted } = await supabaseAdmin
        .from('system_config')
        .insert({ key, value })
        .select()
        .single();
      return NextResponse.json({ data: inserted });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
