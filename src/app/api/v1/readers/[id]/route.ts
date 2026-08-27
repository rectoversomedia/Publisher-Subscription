// GET /api/v1/readers/[id] — Reader Detail
// Uses direct Supabase REST API to avoid connection pool issues
import { NextRequest, NextResponse } from 'next/server';
import { explainDecision } from '@/decision';
import type { RevenueAction, ReasonCode, ReaderFeature } from '@/domain/types';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function sbQuery(table: string, params: string = '') {
  const url = `${SB_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Fetch reader with features and topic affinity
    const reader = await sbQuery(
      'readers',
      `id=eq.${encodeURIComponent(id)}&select=*,anonymous_id`
    ) as Array<Record<string, unknown>>;

    if (!reader || reader.length === 0) {
      return NextResponse.json({ error: 'Reader not found' }, { status: 404 });
    }

    const readerData = reader[0];

    const features = await sbQuery(
      'reader_features',
      `reader_id=eq.${encodeURIComponent(id)}&select=*`
    ) as Array<Record<string, unknown>>;

    const topicAffinity = await sbQuery(
      'reader_topic_affinity',
      `reader_id=eq.${encodeURIComponent(id)}&select=*&order=score.desc`
    ) as Array<Record<string, unknown>>;

    // Get recent decisions
    const decisions = await sbQuery(
      'decisions',
      `reader_id=eq.${encodeURIComponent(id)}&select=*&order=timestamp.desc&limit=10`
    ) as Array<Record<string, unknown>>;

    // Get recent events
    const events = await sbQuery(
      'events',
      `reader_id=eq.${encodeURIComponent(id)}&select=*&order=timestamp.desc&limit=50`
    ) as Array<Record<string, unknown>>;

    // Get experiment assignments
    const assignments = await sbQuery(
      'experiment_assignments',
      `reader_id=eq.${encodeURIComponent(id)}&select=*,experiments(id,name,status),experiment_variants(id,name)`
    ) as Array<Record<string, unknown>>;

    // Build latest decision explanation
    const latestDecision = decisions && decisions.length > 0 ? decisions[0] : null;
    let decisionExplanation = null;

    if (latestDecision && features && features.length > 0) {
      const featureData = features[0] as unknown as ReaderFeature;
      decisionExplanation = {
        ...latestDecision,
        explanation: explainDecision(
          {
            decision_id: latestDecision.id as string,
            action: latestDecision.selected_action as RevenueAction,
            confidence: (latestDecision.confidence as number) ?? 0.5,
            reason_codes: (latestDecision.reason_codes as unknown as ReasonCode[]) ?? [],
            decision_version: (latestDecision.decision_version as string) ?? 'rules-v1',
          },
          featureData
        ),
      };
    }

    return NextResponse.json({
      reader: {
        ...readerData,
        features: features && features.length > 0 ? features[0] : null,
        topic_affinity: topicAffinity ?? [],
      },
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
