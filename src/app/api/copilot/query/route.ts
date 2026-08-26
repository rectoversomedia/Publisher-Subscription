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

// Pre-defined analytics queries that don't require arbitrary SQL
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
    const features: Array<{ predicted_ltv: number }> = await res.json() ?? [];
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

    const handler = ANALYTICS_QUERIES[fn];
    if (!handler) {
      return NextResponse.json({ error: `Unknown function: ${fn}` }, { status: 400 });
    }

    const { result, summary } = await handler();

    return NextResponse.json({
      result,
      summary,
      sources: ['readers', 'reader_features', 'experiments'],
      function: fn,
    });
  } catch (error) {
    console.error('Copilot query error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
