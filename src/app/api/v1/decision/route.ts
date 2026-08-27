// POST /api/v1/decision — Revenue Decision Engine
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { makeDecision, persistDecision } from '@/decision';
import type { DecisionContext, LifecycleStage } from '@/domain/types';

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

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`timeout_${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

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

    // Get reader with features (3s timeout)
    const readerQuery = supabaseAdmin
      .from('readers')
      .select(`
        *,
        features:reader_features(*),
        topic_affinity:reader_topic_affinity(*)
      `)
      .eq('id', reader_id)
      .single();
    const readerResult = await withTimeout(Promise.resolve(readerQuery), 3000);
    const { data: reader, error: readerError } = readerResult;

    if (readerError || !reader) {
      return NextResponse.json({ error: 'Reader not found' }, { status: 404 });
    }

    // Get system config (3s timeout)
    const configQuery = supabaseAdmin
      .from('system_config')
      .select('key, value')
      .in('key', ['execution_mode', 'traffic_rollout']);
    const configResult = await withTimeout(Promise.resolve(configQuery), 3000);
    const { data: config } = configResult;

    const executionMode = (config?.find((c: { key: string; value: unknown }) => c.key === 'execution_mode')?.value as string) ?? 'LIVE';

    const features = reader.features ?? {};

    // Enrich context with lifecycle stage + metering from reader_features
    const enrichedContext: DecisionContext = {
      ...context,
      lifecycle_stage: (features as Record<string, unknown>).lifecycle_stage as LifecycleStage | undefined,
      free_articles_read: (features as Record<string, unknown>).free_articles_read as number | undefined,
      free_article_limit: 3, // DEFAULT_FREE_ARTICLE_LIMIT — override via system_config if needed
    };

    // Make decision
    const result = await makeDecision(reader, enrichedContext, { executionMode });

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
    // Safe fallback for shadow mode — never surface 500 to callers
    return NextResponse.json({
      action: 'ALLOW_FREE',
      confidence: 0.1,
      reason_codes: ['SYSTEM_UNAVAILABLE'],
      latency_ms: Date.now() - startTime,
      execution_mode: 'SHADOW',
    });
  }
}
