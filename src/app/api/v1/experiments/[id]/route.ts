// GET /api/v1/experiments/[id] — Experiment Detail
// Uses direct Supabase REST API to avoid connection pool issues
import { NextRequest, NextResponse } from 'next/server';
import { calculateExperimentResults } from '@/experiment';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function sbQueryOne(table: string, params: string) {
  const url = `${SB_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'representation',
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const experiment = await sbQueryOne(
      'experiments',
      `id=eq.${encodeURIComponent(id)}&select=*`
    );

    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Get variants
    const variantsRes = await fetch(
      `${SB_URL}/rest/v1/experiment_variants?experiment_id=eq.${encodeURIComponent(id)}&select=*`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    );
    const variants = variantsRes.ok ? await variantsRes.json() : [];

    let results = null;
    if (experiment.status === 'RUNNING') {
      try {
        results = await calculateExperimentResults(id);
      } catch {
        results = null;
      }
    }

    return NextResponse.json({
      experiment: { ...experiment, experiment_variants: variants },
      results,
    });
  } catch (error) {
    console.error('Experiment detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
