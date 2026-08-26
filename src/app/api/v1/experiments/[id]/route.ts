// GET /api/v1/experiments/[id]
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateExperimentResults } from '@/experiment';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { data: experiment, error } = await supabaseAdmin
      .from('experiments')
      .select('*, experiment_variants(*)')
      .eq('id', id)
      .single();

    if (error || !experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    const results = await calculateExperimentResults(id);

    return NextResponse.json({ experiment, results });
  } catch (error) {
    console.error('Experiment detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
