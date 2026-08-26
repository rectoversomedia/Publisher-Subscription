// GET/POST /api/v1/experiments — Experiment Management
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateExperimentResults, startExperiment, pauseExperiment, completeExperiment } from '@/experiment';

const CreateExperimentSchema = z.object({
  name: z.string().min(1),
  hypothesis: z.string().optional(),
  description: z.string().optional(),
  primary_metric: z.string().default('conversion_rate'),
  guardrail_metrics: z.array(z.string()).default([]),
  audience_definition: z.record(z.unknown()).default({}),
  traffic_percentage: z.number().min(0).max(100).default(100),
  variants: z.array(z.object({
    name: z.string(),
    allocation_percentage: z.number().min(0).max(100),
    action: z.string().optional(),
    offer_id: z.string().optional(),
    configuration: z.record(z.unknown()).default({}),
  })).min(2),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const includeVariants = searchParams.get('include_variants') === 'true';

  try {
    let query = supabaseAdmin
      .from('experiments')
      .select(includeVariants ? '*' : '*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: experiments, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate results for each running experiment
    const results = await Promise.all(
      (experiments ?? []).map(async (exp: Record<string, unknown>) => {
        if (exp.status !== 'RUNNING') return exp;
        const metrics = await calculateExperimentResults(exp.id as string);
        return { ...exp, results: metrics };
      })
    );

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error('Experiments list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateExperimentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid experiment', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { variants, ...experimentData } = parsed.data;

    // Create experiment
    const { data: experiment, error: expError } = await supabaseAdmin
      .from('experiments')
      .insert({
        name: experimentData.name,
        hypothesis: experimentData.hypothesis,
        description: experimentData.description,
        primary_metric: experimentData.primary_metric,
        guardrail_metrics: experimentData.guardrail_metrics,
        audience_definition: experimentData.audience_definition,
        traffic_percentage: experimentData.traffic_percentage,
      })
      .select()
      .single();

    if (expError || !experiment) {
      return NextResponse.json({ error: 'Failed to create experiment' }, { status: 500 });
    }

    // Create variants
    const variantInserts = variants.map((v) => ({
      experiment_id: experiment.id,
      name: v.name,
      allocation_percentage: v.allocation_percentage,
      action: v.action,
      offer_id: v.offer_id,
      configuration: v.configuration,
    }));

    const { data: createdVariants, error: varError } = await supabaseAdmin
      .from('experiment_variants')
      .insert(variantInserts)
      .select();

    if (varError) {
      // Rollback experiment
      await supabaseAdmin.from('experiments').delete().eq('id', experiment.id);
      return NextResponse.json({ error: 'Failed to create variants' }, { status: 500 });
    }

    return NextResponse.json({
      experiment,
      variants: createdVariants,
    }, { status: 201 });
  } catch (error) {
    console.error('Create experiment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/v1/experiments — Update experiment
export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const action = searchParams.get('action');

  if (!id) {
    return NextResponse.json({ error: 'Missing experiment ID' }, { status: 400 });
  }

  try {
    switch (action) {
      case 'start':
        await startExperiment(id);
        return NextResponse.json({ status: 'started' });
      case 'pause':
        await pauseExperiment(id);
        return NextResponse.json({ status: 'paused' });
      case 'complete':
        await completeExperiment(id);
        return NextResponse.json({ status: 'completed' });
      default:
        const body = await request.json();
        const { data, error } = await supabaseAdmin
          .from('experiments')
          .update(body)
          .eq('id', id)
          .select()
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Update experiment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
