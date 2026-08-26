// POST /api/v1/decision — Revenue Decision Engine
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { makeDecision, persistDecision } from '@/decision';
import type { DecisionContext } from '@/domain/types';

const DecisionRequestSchema = z.object({
  reader_id: z.string(),
  context: z.object({
    article_id: z.string().optional(),
    session_id: z.string(),
    platform: z.string().optional(),
    referrer: z.string().optional(),
    utm_source: z.string().optional(),
    category: z.string().optional(),
    topic: z.string().optional(),
  }),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const parsed = DecisionRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { reader_id, context } = parsed.data;

    // Get reader with features
    const { data: reader, error: readerError } = await supabaseAdmin
      .from('readers')
      .select(`
        *,
        features:reader_features(*),
        topic_affinity:reader_topic_affinity(*)
      `)
      .eq('id', reader_id)
      .single();

    if (readerError || !reader) {
      return NextResponse.json({ error: 'Reader not found' }, { status: 404 });
    }

    // Get system config
    const { data: config } = await supabaseAdmin
      .from('system_config')
      .select('key, value')
      .in('key', ['execution_mode', 'traffic_rollout']);

    const executionMode = (config?.find((c) => c.key === 'execution_mode')?.value as string) ?? 'LIVE';

    // Make decision
    const result = await makeDecision(reader, context as DecisionContext, { executionMode });

    // Persist decision
    if (reader.features && executionMode !== 'SHADOW') {
      await persistDecision(reader_id, result, context as DecisionContext, reader.features, executionMode);
    }

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      ...result,
      latency_ms: latencyMs,
      execution_mode: executionMode,
    });
  } catch (error) {
    console.error('Decision error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
