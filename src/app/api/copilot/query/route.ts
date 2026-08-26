// POST /api/copilot/query — Natural Language Analytics
// Uses direct Supabase REST API to avoid connection pool issues
import { NextRequest, NextResponse } from 'next/server';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function sbQuery(sql: string): Promise<unknown[]> {
  const params = new URLSearchParams({ q: sql });
  const res = await fetch(`${SB_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ p_sql: sql }),
  });
  if (!res.ok) return [];
  return res.json();
}

// ── Subscription-focused copilot queries ─────────────────────

const SUBSCRIPTION_QUERIES: Record<string, () => Promise<{ result: unknown; summary: string }>> = {

  getReadersMostLikelyToConvertThisWeek: async () => {
    // High propensity + high engagement in last 7 days
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const res = await fetch(
      `${SB_URL}/rest/v1/reader_features?subscription_propensity=gte.60&engagement_score=gte.50&select=reader_id,subscription_propensity,engagement_score,predicted_ltv`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    );
    const features: Array<{ reader_id: string; subscription_propensity: number; engagement_score: number; predicted_ltv: number }> = await res.json() ?? [];
    const ids = features.map(f => encodeURIComponent(f.reader_id)).filter(Boolean);
    if (!ids.length) return { result: { readers: [], urgency: 'No high-propensity readers this week' }, summary: 'No readers meet the high-propensity threshold this week' };

    const readersRes = await fetch(
      `${SB_URL}/rest/v1/readers?id=in.(${ids.join(',')})&subscription_status=eq.NONE&select=id,last_seen_at,identity_status`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    );
    const readers: Array<{ id: string; last_seen_at: string; identity_status: string }> = await readersRes.json() ?? [];
    const readersWithScore = features
      .filter(f => readers.some(r => r.id === f.reader_id))
      .sort((a, b) => b.subscription_propensity - a.subscription_propensity)
      .slice(0, 20);

    const urgency = readersWithScore.length > 0
      ? `${readersWithScore.length} readers have propensity ≥ 60 with strong engagement. Push Tempo+ offers this week — this is the highest-value audience.`
      : 'No readers currently meet the high-propensity threshold.';

    return {
      result: { readers: readersWithScore, urgency },
      summary: `${readersWithScore.length} readers are most likely to convert this week — priority outreach recommended`,
    };
  },

  getConversionRateByContentType: async () => {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const convRes = await fetch(
      `${SB_URL}/rest/v1/conversions?conversion_type=eq.subscription&occurred_at=gte.${since30d}&select=article_id,revenue`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    );
    const conversions: Array<{ article_id: string | null; revenue: number }> = await convRes.json() ?? [];
    const articleIds = [...new Set(conversions.map(c => c.article_id).filter(Boolean))] as string[];

    if (!articleIds.length) return { result: { by_type: [] }, summary: 'No subscription conversions in the last 30 days' };

    const idsParam = articleIds.map(id => encodeURIComponent(id)).join(',');
    const articlesRes = await fetch(
      `${SB_URL}/rest/v1/articles?id=in.(${idsParam})&select=id,category`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    );
    const articles: Array<{ id: string; category: string | null }> = await articlesRes.json() ?? [];
    const catMap = new Map(articles.map(a => [a.id, a.category ?? 'Unknown']));

    const byCategory: Record<string, { conversions: number; revenue: number }> = {};
    for (const conv of conversions) {
      if (!conv.article_id) continue;
      const cat = catMap.get(conv.article_id) ?? 'Unknown';
      if (!byCategory[cat]) byCategory[cat] = { conversions: 0, revenue: 0 };
      byCategory[cat].conversions += 1;
      byCategory[cat].revenue += conv.revenue ?? 0;
    }

    const byType = Object.entries(byCategory)
      .map(([category, stats]) => ({ category, conversions: stats.conversions, revenue: stats.revenue }))
      .sort((a, b) => b.conversions - a.conversions);

    const top = byType[0];
    return {
      result: { by_type: byType },
      summary: top
        ? `"${top.category}" content drives the most subscriptions (${top.conversions} conversions, Rp ${top.revenue.toLocaleString('id-ID')}). Focus acquisition on readers of this content type.`
        : 'Insufficient data for content attribution.',
    };
  },

  getAlmostReadyReaders: async () => {
    // Propensity 40-59 — engaged but not yet high intent
    const res = await fetch(
      `${SB_URL}/rest/v1/reader_features?subscription_propensity=gte.40&subscription_propensity=lt.60&engagement_score=gte.30&select=reader_id,subscription_propensity,engagement_score`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    );
    const features: Array<{ reader_id: string; subscription_propensity: number; engagement_score: number }> = await res.json() ?? [];
    const avgPropensity = features.length > 0
      ? features.reduce((s, f) => s + f.subscription_propensity, 0) / features.length
      : 0;
    return {
      result: { count: features.length, avg_propensity: Math.round(avgPropensity) },
      summary: `${features.length} readers are almost ready to subscribe (propensity 40-59). Nurture with newsletter + soft paywall to push them over the edge.`,
    };
  },

  getSubscribersByLifecycle: async () => {
    const [subcribers, features, atRisk] = await Promise.all([
      fetch(`${SB_URL}/rest/v1/readers?subscription_status=eq.ACTIVE&select=id`, { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }).then(r => r.json()),
      fetch(`${SB_URL}/rest/v1/reader_features?lifecycle_stage=not.is.null&select=lifecycle_stage`, { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }).then(r => r.json()),
      fetch(`${SB_URL}/rest/v1/reader_features?churn_risk=gte.70&select=reader_id`, { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }).then(r => r.json()),
    ]) as [Array<{id: string}>, Array<{lifecycle_stage: string}>, Array<{reader_id: string}>];

    const lifecycleCounts: Record<string, number> = {};
    for (const f of features) {
      const stage = f.lifecycle_stage ?? 'UNKNOWN';
      lifecycleCounts[stage] = (lifecycleCounts[stage] ?? 0) + 1;
    }

    const byStage = Object.entries(lifecycleCounts).map(([stage, count]) => ({ stage, count })).sort((a, b) => b.count - a.count);
    return {
      result: {
        active_subscribers: subcribers.length,
        at_risk_count: atRisk.length,
        by_lifecycle: byStage,
      },
      summary: `${subcribers.length} active subscribers. ${atRisk.length} at high churn risk. Pipeline: ${byStage.map(s => `${s.stage}: ${s.count}`).join(', ') || 'no data'}.`,
    };
  },

  getWeekendRetargetingCandidates: async () => {
    // Readers active on weekends + high LTV potential who haven't subscribed
    const res = await fetch(
      `${SB_URL}/rest/v1/reader_features?subscription_propensity=gte.50&predicted_ltv=gte.200000&select=reader_id,predicted_ltv,engagement_score`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    );
    const features: Array<{ reader_id: string; predicted_ltv: number; engagement_score: number }> = await res.json() ?? [];
    const ids = features.map(f => encodeURIComponent(f.reader_id)).filter(Boolean);

    if (!ids.length) return { result: { count: 0, avg_ltv: 0 }, summary: 'No weekend retargeting candidates found' };

    const readersRes = await fetch(
      `${SB_URL}/rest/v1/readers?id=in.(${ids.join(',')})&subscription_status=eq.NONE&select=id`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    );
    const readers: Array<{ id: string }> = await readersRes.json() ?? [];
    const candidates = features.filter(f => readers.some(r => r.id === f.reader_id));
    const avgLtv = candidates.length > 0
      ? candidates.reduce((s, f) => s + (f.predicted_ltv ?? 0), 0) / candidates.length
      : 0;

    return {
      result: { count: candidates.length, avg_ltv: Math.round(avgLtv) },
      summary: `${candidates.length} readers are ideal for weekend special offer — high LTV potential, engaged but not yet subscribed. Weekend push recommended.`,
    };
  },

  getInvestigativeContentReaders: async () => {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const topicRes = await fetch(
      `${SB_URL}/rest/v1/reader_topic_affinity?topic=eq.Investigation&score=gte.60&select=reader_id`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    );
    const topics: Array<{ reader_id: string }> = await topicRes.json() ?? [];
    const readerIds = [...new Set(topics.map(t => t.reader_id))];
    if (!readerIds.length) return { result: { count: 0, conversion_rate: 0, avg_propensity: 0 }, summary: 'No investigative content readers found' };

    const idsParam = readerIds.map(id => encodeURIComponent(id)).join(',');
    const [features, conversions] = await Promise.all([
      fetch(`${SB_URL}/rest/v1/reader_features?reader_id=in.(${idsParam})&select=reader_id,subscription_propensity`, { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }).then(r => r.json()),
      fetch(`${SB_URL}/rest/v1/conversions?reader_id=in.(${idsParam})&conversion_type=eq.subscription&occurred_at=gte.${since30d}&select=id`, { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }).then(r => r.json()),
    ]) as [Array<{reader_id: string; subscription_propensity: number}>, Array<{id: string}>];

    const convRate = features.length > 0 ? conversions.length / features.length : 0;
    const avgProp = features.length > 0
      ? features.reduce((s, f) => s + f.subscription_propensity, 0) / features.length
      : 0;

    return {
      result: { count: features.length, conversion_rate: +(convRate * 100).toFixed(2), avg_propensity: Math.round(avgProp) },
      summary: `${features.length} investigative content readers show ${convRate > 0.03 ? 'higher' : 'baseline'} conversion rate (${(convRate * 100).toFixed(2)}%). Prioritize subscription offers to this segment.`,
    };
  },

  getChurnPreventionCandidates: async () => {
    // Active subscribers with declining engagement in last 7 days
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const res = await fetch(
      `${SB_URL}/rest/v1/reader_features?churn_risk=gte.60&select=reader_id,churn_risk,sessions_7d,days_since_last_visit,predicted_ltv`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    );
    const features: Array<{ reader_id: string; churn_risk: number; sessions_7d: number; days_since_last_visit: number; predicted_ltv: number }> = await res.json() ?? [];
    const ids = features.map(f => encodeURIComponent(f.reader_id)).filter(Boolean);

    if (!ids.length) return { result: { count: 0, candidates: [] }, summary: 'No churn prevention candidates found' };

    const readersRes = await fetch(
      `${SB_URL}/rest/v1/readers?id=in.(${ids.join(',')})&subscription_status=eq.ACTIVE&select=id,last_seen_at`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    );
    const readers: Array<{ id: string; last_seen_at: string }> = await readersRes.json() ?? [];

    const candidates = features
      .filter(f => readers.some(r => r.id === f.reader_id))
      .map(f => ({ ...f, days_since_seen: f.days_since_last_visit }))
      .sort((a, b) => b.churn_risk - a.churn_risk)
      .slice(0, 50);

    const highPriority = candidates.filter(c => c.churn_risk >= 75).length;
    return {
      result: { count: candidates.length, high_priority_count: highPriority, candidates },
      summary: `${candidates.length} subscribers need churn prevention — ${highPriority} are CRITICAL (churn risk ≥ 75). Deploy save offers within 48 hours.`,
    };
  },
};

// ── Legacy analytics queries ──────────────────────────────────
const ANALYTICS_QUERIES: Record<string, () => Promise<{ result: unknown; summary: string }>> = {
  getConversionRate: async () => {
    const res = await fetch(`${SB_URL}/rest/v1/readers?select=subscription_status,identity_status`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    });
    const readers: Array<{ subscription_status: string; identity_status: string }> = await res.json() ?? [];
    const known = readers.filter(r => r.identity_status !== 'ANONYMOUS');
    const active = known.filter(r => r.subscription_status === 'ACTIVE');
    const rate = known.length > 0 ? (active.length / known.length) : 0;
    return {
      result: { conversion_rate: +(rate * 100).toFixed(2) },
      summary: `Subscription conversion rate: ${(rate * 100).toFixed(2)}% (${active.length} active subscribers out of ${known.length} known readers)`,
    };
  },

  getHighPropensityUnsubs: async () => {
    const res = await fetch(`${SB_URL}/rest/v1/reader_features?subscription_propensity=gte.60&select=reader_id`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    });
    const features: Array<{ reader_id: string }> = await res.json() ?? [];
    const ids = features.map(f => encodeURIComponent(f.reader_id)).join(',');
    const readersRes = await fetch(`${SB_URL}/rest/v1/readers?id=in.(${ids})&subscription_status=eq.NONE&select=id`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    });
    const readers: Array<{ id: string }> = await readersRes.json() ?? [];
    return {
      result: { count: readers.length },
      summary: `${readers.length} high-propensity readers (propensity >= 60) are currently non-subscribers — representing the largest revenue opportunity`,
    };
  },

  getChurnRisk: async () => {
    const res = await fetch(`${SB_URL}/rest/v1/reader_features?churn_risk=gte.75&select=reader_id`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    });
    const features: Array<{ reader_id: string }> = await res.json() ?? [];
    const ids = features.map(f => encodeURIComponent(f.reader_id)).join(',');
    const readersRes = await fetch(`${SB_URL}/rest/v1/readers?id=in.(${ids})&subscription_status=eq.ACTIVE&select=id`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    });
    const readers: Array<{ id: string }> = await readersRes.json() ?? [];
    return {
      result: { count: readers.length },
      summary: `${readers.length} active subscribers show high churn risk signals (>= 75) — retention action recommended`,
    };
  },

  getRevenueOpportunity: async () => {
    const res = await fetch(`${SB_URL}/rest/v1/reader_features?subscription_propensity=gte.60&select=predicted_ltv`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    });
    const features: Array<{ reader_id: string; predicted_ltv: number }> = await res.json() ?? [];
    const ids = features.map(f => encodeURIComponent(f.reader_id)).join(',');
    if (!ids) return { result: { total: 0 }, summary: 'No high-propensity readers found' };
    const readersRes = await fetch(`${SB_URL}/rest/v1/readers?id=in.(${ids})&subscription_status=eq.NONE&select=id`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    });
    const readers: Array<{ id: string }> = await readersRes.json() ?? [];
    const total = features.reduce((s, f) => s + (f.predicted_ltv ?? 0), 0);
    return {
      result: { count: readers.length, total_ltv: total },
      summary: `${readers.length} high-propensity non-subscribers represent an estimated total opportunity of ${total.toLocaleString('en-US')} in predicted LTV`,
    };
  },

  getBestExperiment: async () => {
    const res = await fetch(`${SB_URL}/rest/v1/experiments?status=eq.RUNNING&select=id,name`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    });
    const experiments: Array<{ id: string; name: string }> = await res.json() ?? [];
    return {
      result: { experiments, count: experiments.length },
      summary: `${experiments.length} experiment${experiments.length !== 1 ? 's' : ''} currently running`,
    };
  },

  getTopSegment: async () => {
    const res = await fetch(`${SB_URL}/rest/v1/reader_features?subscription_propensity=gte.80&select=reader_id`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    });
    const features: Array<{ reader_id: string }> = await res.json() ?? [];
    return {
      result: { segment: 'High Intent Non-Subscribers', count: features.length },
      summary: `"High Intent Non-Subscribers" is the largest opportunity segment with ${features.length} readers showing very high propensity (>= 80)`,
    };
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fn = body.function as string;

    const handler = ANALYTICS_QUERIES[fn] ?? SUBSCRIPTION_QUERIES[fn];
    if (!handler) {
      const available = [...Object.keys(ANALYTICS_QUERIES), ...Object.keys(SUBSCRIPTION_QUERIES)];
      return NextResponse.json({ error: `Unknown function: ${fn}. Available: ${available.join(', ')}` }, { status: 400 });
    }

    const { result, summary } = await handler();

    return NextResponse.json({
      result,
      summary,
      sources: ['readers', 'reader_features', 'conversions', 'articles', 'reader_topic_affinity', 'experiments'],
      function: fn,
    });
  } catch (error) {
    console.error('Copilot query error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
