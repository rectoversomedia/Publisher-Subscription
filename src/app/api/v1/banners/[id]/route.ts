// PATCH /api/v1/banners/[id] — Update banner
// DELETE /api/v1/banners/[id] — Delete banner
// GET /api/v1/banners/[id] — Get single banner with stats
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface RouteParams { params: { id: string } }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { data, error } = await supabaseAdmin
      .from('offer_banners')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Banner not found' }, { status: 404 });

    const { data: stats } = await supabaseAdmin
      .from('banner_stats')
      .select('*')
      .eq('banner_id', params.id)
      .single();

    return NextResponse.json({ data: { ...data, stats } });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const { data, error } = await supabaseAdmin
      .from('offer_banners')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
      throw error;
    }
    if (!data) return NextResponse.json({ error: 'Banner not found' }, { status: 404 });

    return NextResponse.json({ data, message: 'Banner updated' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { error } = await supabaseAdmin
      .from('offer_banners')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ message: 'Banner deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
