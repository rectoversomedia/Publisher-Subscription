// GET /api/v1/experiments — Experiment Management
// Uses direct Supabase REST API to avoid connection pool issues
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateExperimentResults, startExperiment, pauseExperiment, completeExperiment } from '@/experiment';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function sbQuery(table: string, params: string = '') {
  const url = `${SB_URL}/rest/v1/${table}${params ? `?${params}` : ''}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) return [];
  return res.json();
}

async function sbInsert(table: string, data: unknown) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return res;
}

async function sbUpdate(table: string, id: string, data: unknown) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return res;
}

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

  try {
    let params = 'select=*&order=created_at.desc';
    if (status) {
      params += `&status=eq.${status}`;
    }

    const experiments = await sbQuery('experiments', params) as Array<Record<string, unknown>>;

    // Calculate results for each running experiment
    const enriched = await Promise.all(
      experiments.map(async (exp) => {
        if (exp.status !== 'RUNNING') return { ...exp, results: null };
        try {
          const results = await calculateExperimentResults(exp.id as string);
          return { ...exp, results };
        } catch {
          return { ...exp, results: null };
        }
      })
    );

    return NextResponse.json({ data: enriched });
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
    const expRes = await fetch(`${SB_URL}/rest/v1/experiments`, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        name: experimentData.name,
        hypothesis: experimentData.hypothesis ?? null,
        description: experimentData.description ?? null,
        primary_metric: experimentData.primary_metric,
        guardrail_metrics: experimentData.guardrail_metrics,
        audience_definition: experimentData.audience_definition,
        traffic_percentage: experimentData.traffic_percentage,
      }),
    });

    if (!expRes.ok) {
      return NextResponse.json({ error: 'Failed to create experiment' }, { status: 500 });
    }

    const experiments = await expRes.json();
    const experiment = Array.isArray(experiments) ? experiments[0] : experiments;

    if (!experiment?.id) {
      return NextResponse.json({ error: 'Failed to create experiment' }, { status: 500 });
    }

    // Create variants
    const variantInserts = variants.map((v) => ({
      experiment_id: experiment.id,
      name: v.name,
      allocation_percentage: v.allocation_percentage,
      action: v.action ?? null,
      offer_id: v.offer_id ?? null,
      configuration: v.configuration,
    }));

    const varRes = await sbInsert('experiment_variants', variantInserts);

    if (!varRes.ok) {
      // Rollback experiment
      await fetch(`${SB_URL}/rest/v1/experiments?id=eq.${experiment.id}`, {
        method: 'DELETE',
        headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
      });
      return NextResponse.json({ error: 'Failed to create variants' }, { status: 500 });
    }

    const createdVariants = await varRes.json();

    return NextResponse.json({ experiment, variants: createdVariants }, { status: 201 });
  } catch (error) {
    console.error('Create experiment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/v1/experiments — Update experiment (start/pause/complete)
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
      default: {
        const body = await request.json();
        const updateRes = await sbUpdate('experiments', id, body);
        if (!updateRes.ok) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
        return NextResponse.json({ status: 'updated' });
      }
    }
  } catch (error) {
    console.error('Update experiment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
