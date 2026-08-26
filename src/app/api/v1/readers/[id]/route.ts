// GET /api/v1/readers/[id] — Reader Detail
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { explainDecision } from '@/decision';
import type { ReaderProfile } from '@/domain/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { data: reader, error } = await supabaseAdmin
      .from('readers')
      .select(`
        *,
        features:reader_features(*),
        topic_affinity:reader_topic_affinity(*)
      `)
      .eq('id', id)
      .single();

    if (error || !reader) {
      return NextResponse.json({ error: 'Reader not found' }, { status: 404 });
    }

    // Get recent decisions
    const { data: decisions } = await supabaseAdmin
      .from('decisions')
      .select('*')
      .eq('reader_id', id)
      .order('timestamp', { ascending: false })
      .limit(10);

    // Get recent events
    const { data: events } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('reader_id', id)
      .order('timestamp', { ascending: false })
      .limit(50);

    // Get experiment assignments
    const { data: assignments } = await supabaseAdmin
      .from('experiment_assignments')
      .select(`
        *,
        experiments(id, name, status),
        experiment_variants(id, name)
      `)
      .eq('reader_id', id);

    // Build latest decision explanation
    const latestDecision = decisions?.[0];
    let decisionExplanation = null;

    if (latestDecision && reader.features) {
      decisionExplanation = {
        ...latestDecision,
        explanation: explainDecision(
          {
            decision_id: latestDecision.id,
            action: latestDecision.selected_action,
            offer: null,
            confidence: latestDecision.confidence ?? 0.5,
            reason_codes: latestDecision.reason_codes ?? [],
            decision_version: latestDecision.decision_version,
          },
          reader.features
        ),
      };
    }

    return NextResponse.json({
      reader: reader as ReaderProfile,
      decisions: decisions ?? [],
      events: events ?? [],
      experiment_assignments: assignments ?? [],
      latest_decision_explanation: decisionExplanation,
    });
  } catch (error) {
    console.error('Reader detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
