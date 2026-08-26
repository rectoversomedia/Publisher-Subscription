// POST /api/v1/banners/track — Record banner impression/click/dismiss/conversion
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      banner_id,
      reader_id,
      anonymous_id,
      event_type,
      variant_shown = 'A',
      article_id,
      session_id,
      platform = 'web',
      lifecycle_stage,
      subscription_propensity,
      revenue = 0,
    } = body;

    if (!banner_id || !event_type) {
      return NextResponse.json({ error: 'banner_id and event_type are required' }, { status: 400 });
    }

    const validEvents = ['impression', 'click', 'dismiss', 'conversion'];
    if (!validEvents.includes(event_type)) {
      return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('banner_impressions')
      .insert({
        banner_id,
        reader_id,
        anonymous_id,
        event_type,
        variant_shown,
        article_id,
        session_id,
        platform,
        lifecycle_stage,
        subscription_propensity,
        revenue,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Banner track error:', error);
      // Non-critical — don't fail the request
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
