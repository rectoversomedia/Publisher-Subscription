// GET /api/v1/banners — List all banners with stats
// POST /api/v1/banners — Create banner
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { OfferBanner, BannerWithStats } from '@/domain/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabaseAdmin
      .from('offer_banners')
      .select('*')
      .order('priority', { ascending: false });

    if (type) query = query.eq('banner_type', type);
    if (activeOnly) query = query.eq('is_active', true);

    const { data: banners, error } = await query;

    if (error) throw error;

    // Fetch stats for each banner
    const bannerIds = (banners ?? []).map(b => b.id);
    if (bannerIds.length === 0) return NextResponse.json({ data: [], total: 0 });

    const { data: statsRows } = await supabaseAdmin
      .from('banner_stats')
      .select('*')
      .in('banner_id', bannerIds);

    const statsMap = new Map((statsRows ?? []).map(s => [s.banner_id, s]));

    const result: BannerWithStats[] = (banners ?? []).map(banner => ({
      ...banner,
      stats: statsMap.get(banner.id) ?? null,
    }));

    return NextResponse.json({ data: result, total: result.length });
  } catch (error) {
    console.error('GET banners error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name, slug, banner_type, headline, headline_variant_b, body_copy, body_copy_variant_b,
      cta_label, cta_label_variant_b, cta_action, layout, theme, icon,
      accent_color, background_color, text_color, badge_label, badge_color,
      show_price, original_price, discounted_price, billing_period,
      target_lifecycle, target_min_propensity, target_max_propensity, target_platform,
      is_ab_test, variant_allocation_percentage, is_active, priority,
      starts_at, ends_at, impression_cap, impressions_per_reader,
      offer_id, experiment_id,
    } = body;

    if (!name || !slug || !banner_type || !headline) {
      return NextResponse.json({ error: 'name, slug, banner_type, headline are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('offer_banners')
      .insert({
        name, slug, banner_type, headline, headline_variant_b, body_copy, body_copy_variant_b,
        cta_label, cta_label_variant_b, cta_action, layout, theme, icon,
        accent_color, background_color, text_color, badge_label, badge_color,
        show_price, original_price, discounted_price, billing_period,
        target_lifecycle, target_min_propensity, target_max_propensity, target_platform,
        is_ab_test, variant_allocation_percentage, is_active, priority,
        starts_at, ends_at, impression_cap, impressions_per_reader,
        offer_id, experiment_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
      throw error;
    }

    return NextResponse.json({ data, message: 'Banner created successfully' }, { status: 201 });
  } catch (error) {
    console.error('POST banner error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
