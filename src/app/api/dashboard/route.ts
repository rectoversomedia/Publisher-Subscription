// GET /api/dashboard — Dashboard Data
import { NextResponse } from 'next/server';
import { getDashboardKPIs, getSubscriptionFunnel, getReaderSegments, getRecentDecisions, getRevenueAttribution, getActiveExperiments } from '@/analytics';

const MOCK_KPIS = {
  reader_revenue: 489200000,
  subscription_conversion: 0.031,
  revenue_per_1000_readers: 12400,
  high_propensity_audience: 847,
  revenue_opportunity: 312000000000,
  subscribers_at_risk: 234,
  active_readers_30d: 39420,
  new_subscribers_30d: 127,
  churned_subscribers_30d: 38,
  total_conversions_30d: 412,
  total_revenue_30d: 489200000,
  avg_ltv: 284000,
};

const MOCK_FUNNEL = {
  unique_readers: 39420,
  known_readers: 18234,
  paywall_exposed: 8934,
  offer_clicks: 2341,
  checkout_starts: 891,
  subscriptions: 412,
};

const MOCK_SEGMENTS = [
  { name: 'High Intent Non-Subscribers', key: 'high_intent_non_subs', count: 847, conversion_rate: 0.023, avg_ltv: 387000, estimated_revenue: 7572000000, recommended_treatment: 'SHOW_MONTHLY' },
  { name: 'At-Risk Subscribers', key: 'at_risk_subs', count: 234, conversion_rate: 0, avg_ltv: 0, estimated_revenue: 0, recommended_treatment: 'SHOW_SAVE_OFFER' },
  { name: 'Investigative Loyalists', key: 'investigative_loyalists', count: 1243, conversion_rate: 0.035, avg_ltv: 350000, estimated_revenue: 15235000000, recommended_treatment: 'SHOW_ANNUAL' },
  { name: 'Registered Non-Subscribers', key: 'registered_non_subs', count: 4218, conversion_rate: 0.012, avg_ltv: 120000, estimated_revenue: 6072000000, recommended_treatment: 'SHOW_REGISTRATION' },
];

const MOCK_DECISIONS = [
  { id: '1', reader_id: 'r1', selected_action: 'SHOW_ANNUAL', confidence: 0.91, reason_codes: ['HIGH_PROPENSITY', 'LOW_PRICE_SENSITIVITY'], timestamp: new Date().toISOString() },
  { id: '2', reader_id: 'r2', selected_action: 'SHOW_MONTHLY', confidence: 0.84, reason_codes: ['MEDIUM_PROPENSITY', 'INVESTIGATIVE_CONTENT'], timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', reader_id: 'r3', selected_action: 'ALLOW_FREE', confidence: 0.95, reason_codes: ['LOW_PROPENSITY', 'NEW_READER'], timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: '4', reader_id: 'r4', selected_action: 'SHOW_SAVE_OFFER', confidence: 0.87, reason_codes: ['ACTIVE_SUBSCRIBER', 'HIGH_CHURN_RISK'], timestamp: new Date(Date.now() - 10800000).toISOString() },
  { id: '5', reader_id: 'r5', selected_action: 'SHOW_WINBACK', confidence: 0.79, reason_codes: ['FORMER_SUBSCRIBER', 'RE_ENGAGEMENT'], timestamp: new Date(Date.now() - 14400000).toISOString() },
];

const MOCK_ATTRIBUTION = {
  total_revenue: 489200000,
  direct_revenue: 198400000,
  experiment_revenue: 187600000,
  assisted_revenue: 103200000,
  experiment_percentage: 0.383,
  assisted_percentage: 0.211,
  direct_percentage: 0.406,
};

const MOCK_EXPERIMENTS = [
  { id: 'e1', name: 'Monthly vs Annual Entry Offer', status: 'RUNNING', primary_metric: 'revenue_per_exposed', traffic_percentage: 100 },
  { id: 'e2', name: 'Registration Wall vs Soft Paywall', status: 'RUNNING', primary_metric: 'conversion_rate', traffic_percentage: 50 },
  { id: 'e3', name: 'Annual Promo vs Monthly for High Intent', status: 'RUNNING', primary_metric: 'ltv_90d', traffic_percentage: 100 },
];

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));
  const result = await Promise.race([promise, timeout]);
  return result;
}

export async function GET() {
  try {
    const [kpis, funnel, segments, recentDecisions, attribution, activeExperiments] = await Promise.all([
      withTimeout(getDashboardKPIs(), 12000),
      withTimeout(getSubscriptionFunnel(), 8000),
      withTimeout(getReaderSegments(), 8000),
      withTimeout(getRecentDecisions(10), 8000),
      withTimeout(getRevenueAttribution(30), 8000),
      withTimeout(getActiveExperiments(), 8000),
    ]);

    const usingMock = kpis === null;

    return NextResponse.json({
      kpis: kpis ?? MOCK_KPIS,
      funnel: funnel ?? MOCK_FUNNEL,
      segments: segments ?? MOCK_SEGMENTS,
      recent_decisions: recentDecisions ?? MOCK_DECISIONS,
      revenue_attribution: attribution ?? MOCK_ATTRIBUTION,
      active_experiments: activeExperiments ?? MOCK_EXPERIMENTS,
      generated_at: new Date().toISOString(),
      _demo: usingMock,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({
      kpis: MOCK_KPIS,
      funnel: MOCK_FUNNEL,
      segments: MOCK_SEGMENTS,
      recent_decisions: MOCK_DECISIONS,
      revenue_attribution: MOCK_ATTRIBUTION,
      active_experiments: MOCK_EXPERIMENTS,
      generated_at: new Date().toISOString(),
      _demo: true,
      error: 'Database unavailable — showing demo data',
    }, { status: 200 });
  }
}
