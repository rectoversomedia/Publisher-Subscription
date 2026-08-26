// ============================================================
// Experimentation Engine
// Deterministic sticky A/B/n assignment
// ============================================================

import { supabaseAdmin } from '@/lib/supabase';
import type { Experiment, ExperimentVariant, ExperimentAssignment, ExperimentResult } from '@/domain/types';

// ── Deterministic Hash Assignment ───────────────────────────

function hashToBucket(readerId: string, experimentId: string): number {
  let hash = 0;
  const str = `${readerId}:${experimentId}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // convert to 32bit int
  }
  return Math.abs(hash) % 100;
}

// ── Assignment ─────────────────────────────────────────────

export async function assignReaderToExperiment(
  readerId: string,
  experiment: Experiment,
  variants: ExperimentVariant[]
): Promise<ExperimentVariant | null> {
  if (variants.length === 0) return null;
  if (experiment.status !== 'RUNNING') return null;

  // Check if already assigned
  const { data: existing } = await supabaseAdmin
    .from('experiment_assignments')
    .select('variant_id, experiment_variants(*)')
    .eq('reader_id', readerId)
    .eq('experiment_id', experiment.id)
    .single();

  if (existing?.variant_id) {
    return variants.find((v) => v.id === existing.variant_id) ?? null;
  }

  // Check traffic percentage
  const bucket = hashToBucket(readerId, experiment.id);
  if (bucket >= experiment.traffic_percentage) return null;

  // Deterministic assignment
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.allocation_percentage;
    if (bucket < cumulative) {
      // Persist assignment
      await supabaseAdmin.from('experiment_assignments').insert({
        experiment_id: experiment.id,
        variant_id: variant.id,
        reader_id: readerId,
      });
      return variant;
    }
  }

  // Default to last variant
  const lastVariant = variants[variants.length - 1];
  if (lastVariant) {
    await supabaseAdmin.from('experiment_assignments').insert({
      experiment_id: experiment.id,
      variant_id: lastVariant.id,
      reader_id: readerId,
    });
  }
  return lastVariant ?? null;
}

// ── Audience Matching ──────────────────────────────────────

export function matchesAudience(
  reader: { subscription_propensity?: number; subscription_status?: string; identity_status?: string },
  audienceDef: Experiment['audience_definition']
): boolean {
  const def = audienceDef as Record<string, unknown>;
  if (!def || Object.keys(def).length === 0) return true;

  if (def.propensity_min !== undefined && (reader.subscription_propensity ?? 0) < (def.propensity_min as number)) {
    return false;
  }
  if (def.propensity_max !== undefined && (reader.subscription_propensity ?? 0) > (def.propensity_max as number)) {
    return false;
  }
  if (def.subscription_status !== undefined) {
    const statuses = def.subscription_status as string[];
    if (!statuses.includes(reader.subscription_status ?? '')) return false;
  }
  if (def.identity_status !== undefined) {
    const statuses = def.identity_status as string[];
    if (!statuses.includes(reader.identity_status ?? '')) return false;
  }

  return true;
}

// ── Experiment Results Calculation ─────────────────────────

export async function calculateExperimentResults(
  experimentId: string
): Promise<ExperimentResult[]> {
  // Get variants
  const { data: variants } = await supabaseAdmin
    .from('experiment_variants')
    .select('*')
    .eq('experiment_id', experimentId);

  if (!variants || variants.length === 0) return [];

  // Get assignments count per variant
  const { data: assignments } = await supabaseAdmin
    .from('experiment_assignments')
    .select('variant_id')
    .eq('experiment_id', experimentId);

  const exposuresByVariant = new Map<string, number>();
  for (const a of assignments ?? []) {
    exposuresByVariant.set(
      a.variant_id,
      (exposuresByVariant.get(a.variant_id) ?? 0) + 1
    );
  }

  // Get conversions per variant
  const { data: conversions } = await supabaseAdmin
    .from('conversions')
    .select('variant_id, revenue')
    .eq('experiment_id', experimentId);

  const conversionsByVariant = new Map<string, { count: number; revenue: number }>();
  for (const c of conversions ?? []) {
    const current = conversionsByVariant.get(c.variant_id ?? '') ?? { count: 0, revenue: 0 };
    conversionsByVariant.set(c.variant_id ?? '', {
      count: current.count + 1,
      revenue: current.revenue + (c.revenue ?? 0),
    });
  }

  // Build results
  const results: ExperimentResult[] = variants.map((variant) => {
    const exposures = exposuresByVariant.get(variant.id) ?? 0;
    const conv = conversionsByVariant.get(variant.id) ?? { count: 0, revenue: 0 };
    const conversionRate = exposures > 0 ? conv.count / exposures : 0;
    const revenuePerExposed = exposures > 0 ? conv.revenue / exposures : 0;

    return {
      experiment_id: experimentId,
      variant_id: variant.id,
      exposures,
      conversions: conv.count,
      conversion_rate: conversionRate,
      revenue: conv.revenue,
      revenue_per_exposed: revenuePerExposed,
    };
  });

  // Calculate lift vs control (first variant = control)
  if (results.length > 1 && results[0]!.exposures > 0) {
    const controlRate = results[0]!.conversion_rate;
    for (let i = 1; i < results.length; i++) {
      if (results[i]!.exposures > 0 && controlRate > 0) {
        results[i]!.lift_vs_control = (results[i]!.conversion_rate - controlRate) / controlRate;
        // Simple significance check (would use proper stats in production)
        const n1 = results[0]!.exposures;
        const n2 = results[i]!.exposures;
        results[i]!.is_significant = Math.abs(results[i]!.lift_vs_control ?? 0) > 0.05 &&
          n1 > 100 && n2 > 100;
      }
    }
  }

  return results;
}

// ── Experiment Lifecycle ───────────────────────────────────

export async function startExperiment(experimentId: string): Promise<void> {
  await supabaseAdmin
    .from('experiments')
    .update({
      status: 'RUNNING',
      start_at: new Date().toISOString(),
    })
    .eq('id', experimentId);
}

export async function pauseExperiment(experimentId: string): Promise<void> {
  await supabaseAdmin
    .from('experiments')
    .update({ status: 'PAUSED' })
    .eq('id', experimentId);
}

export async function completeExperiment(experimentId: string): Promise<void> {
  await supabaseAdmin
    .from('experiments')
    .update({
      status: 'COMPLETED',
      end_at: new Date().toISOString(),
    })
    .eq('id', experimentId);
}

export async function archiveExperiment(experimentId: string): Promise<void> {
  await supabaseAdmin
    .from('experiments')
    .update({ status: 'ARCHIVED' })
    .eq('id', experimentId);
}
