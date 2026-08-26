// GET /api/news-moments
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { detectNewsMoments, getActiveNewsMoments } from '@/analytics/news-moments';

export async function GET() {
  try {
    const moments = await getActiveNewsMoments();
    return NextResponse.json({ data: moments });
  } catch (error) {
    console.error('News moments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
