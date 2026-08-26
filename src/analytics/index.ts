// ============================================================
// Analytics Engine — Revenue Intelligence & Attribution
// ============================================================

import { supabaseAdmin } from '@/lib/supabase';
import type { DashboardKPIs, SubscriptionFunnel, ReaderSegment } from '@/domain/types';

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Active readers 30d
  const { count: activeReaders30d } = await supabaseAdmin
    .from('readers')
    .select('*', { count: 'exact', head: true });

  // New subscribers 30d
  const { count: newSubs30d } = await supabaseAdmin
    .from('readers')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_status', 'ACTIVE')
    .gte('subscription_started_at', thirtyDaysAgo.toISOString());

  // Total conversions 30d
  const { data: conversions30d } = await supabaseAdmin
    .from('conversions')
    .select('revenue')
    .eq('conversion_type', 'subscription')
    .gte('occurred_at', thirtyDaysAgo.toISOString());

  const totalRevenue30d = conversions30d?.reduce((sum, c) => sum + (c.revenue ?? 0), 0) ?? 0;
  const totalConversions30d = conversions30d?.length ?? 0;

  // Subscription conversion rate
  const { count: knownReaders } = await supabaseAdmin
    .from('readers')
    .select('*', { count: 'exact', head: true })
    .neq('identity_status', 'ANONYMOUS');

  const { count: activeSubs } = await supabaseAdmin
    .from('readers')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_status', 'ACTIVE');

  const subscriptionConversion = knownReaders && knownReaders > 0
    ? (activeSubs ?? 0) / knownReaders
    : 0;

  // Revenue per 1000 readers
  const { count: totalReaders } = await supabaseAdmin
    .from('readers')
    .select('*', { count: 'exact', head: true });

  const revenuePer1000 = totalReaders && totalReaders > 0
    ? (totalRevenue30d / totalReaders) * 1000
    : 0;

  // High propensity audience (>= 60)
  const { count: highPropensity } = await supabaseAdmin
    .from('reader_features')
    .select('*', { count: 'exact', head: true })
    .gte('subscription_propensity', 60);

  // Subscribers at risk (churn >= 75) - use subquery
  const { data: atRiskData } = await supabaseAdmin
    .from('reader_features')
    .select('reader_id')
    .gte('churn_risk', 75);

  const atRiskReaderIds = new Set(atRiskData?.map((r) => r.reader_id) ?? []);
  let atRisk = 0;
  if (atRiskReaderIds.size > 0) {
    const { count } = await supabaseAdmin
      .from('readers')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'ACTIVE');
    atRisk = count ?? 0;
  }

  // Revenue opportunity (high propensity non-subscribers)
  const { data: highPropNonSubs } = await supabaseAdmin
    .from('reader_features')
    .select('predicted_ltv')
    .gte('subscription_propensity', 60)
    .limit(10000);

  const revenueOpportunity = highPropNonSubs?.reduce((sum, r) => sum + (r.predicted_ltv ?? 0), 0) ?? 0;

  // Avg LTV
  const { data: ltvData } = await supabaseAdmin
    .from('reader_features')
    .select('predicted_ltv')
    .gt('predicted_ltv', 0)
    .limit(1000);

  const avgLtv = ltvData && ltvData.length > 0
    ? ltvData.reduce((sum, r) => sum + (r.predicted_ltv ?? 0), 0) / ltvData.length
    : 0;

  return {
    reader_revenue: totalRevenue30d,
    subscription_conversion: subscriptionConversion,
    revenue_per_1000_readers: revenuePer1000,
    high_propensity_audience: highPropensity ?? 0,
    revenue_opportunity: revenueOpportunity,
    subscribers_at_risk: atRisk,
    active_readers_30d: activeReaders30d ?? 0,
    new_subscribers_30d: newSubs30d ?? 0,
    churned_subscribers_30d: 0,
    total_conversions_30d: totalConversions30d,
    total_revenue_30d: totalRevenue30d,
    avg_ltv: avgLtv,
  };
}

export async function getSubscriptionFunnel(): Promise<SubscriptionFunnel> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [uniqueReaders, knownReaders, paywallExposed, offerClicks, checkoutStarts, subscriptions] =
    await Promise.all([
      supabaseAdmin.from('events').select('reader_id', { count: 'exact', head: true })
        .gte('timestamp', thirtyDaysAgo.toISOString()),
      supabaseAdmin.from('readers').select('*', { count: 'exact', head: true })
        .neq('identity_status', 'ANONYMOUS'),
      supabaseAdmin.from('events').select('reader_id', { count: 'exact', head: true })
        .eq('event_name', 'paywall_view').gte('timestamp', thirtyDaysAgo.toISOString()),
      supabaseAdmin.from('events').select('reader_id', { count: 'exact', head: true })
        .eq('event_name', 'subscription_offer_click').gte('timestamp', thirtyDaysAgo.toISOString()),
      supabaseAdmin.from('events').select('reader_id', { count: 'exact', head: true })
        .eq('event_name', 'checkout_start').gte('timestamp', thirtyDaysAgo.toISOString()),
      supabaseAdmin.from('conversions').select('*', { count: 'exact', head: true })
        .eq('conversion_type', 'subscription').gte('occurred_at', thirtyDaysAgo.toISOString()),
    ]);

  return {
    unique_readers: uniqueReaders.count ?? 0,
    known_readers: knownReaders.count ?? 0,
    paywall_exposed: paywallExposed.count ?? 0,
    offer_clicks: offerClicks.count ?? 0,
    checkout_starts: checkoutStarts.count ?? 0,
    subscriptions: subscriptions.count ?? 0,
  };
}

export async function getReaderSegments(): Promise<ReaderSegment[]> {
  const segments: ReaderSegment[] = [];

  // High Intent Non-Subscribers
  const { data: hiData } = await supabaseAdmin
    .from('reader_features')
    .select('predicted_ltv')
    .limit(10000);

  const highIntentReaders = hiData?.filter((r) => (r.predicted_ltv ?? 0) > 200000) ?? [];
  segments.push({
    name: 'High Intent Non-Subscribers',
    key: 'high_intent_non_subs',
    count: highIntentReaders.length,
    conversion_rate: 0.023,
    avg_ltv: highIntentReaders.length > 0
      ? highIntentReaders.reduce((s, r) => s + (r.predicted_ltv ?? 0), 0) / highIntentReaders.length
      : 0,
    estimated_revenue: highIntentReaders.length * 0.023 * 290000,
    recommended_treatment: 'SHOW_MONTHLY',
  });

  // At-Risk Subscribers
  const { data: atRiskFeatures } = await supabaseAdmin
    .from('reader_features')
    .select('reader_id')
    .gte('churn_risk', 75);

  segments.push({
    name: 'At-Risk Subscribers',
    key: 'at_risk_subs',
    count: atRiskFeatures?.length ?? 0,
    conversion_rate: 0,
    avg_ltv: 0,
    estimated_revenue: 0,
    recommended_treatment: 'SHOW_SAVE_OFFER',
  });

  // Investigative Loyalists
  const { count: invLoy } = await supabaseAdmin
    .from('reader_topic_affinity')
    .select('reader_id', { count: 'exact', head: true })
    .eq('topic', 'Investigation')
    .gte('score', 70);

  segments.push({
    name: 'Investigative Loyalists',
    key: 'investigative_loyalists',
    count: invLoy ?? 0,
    conversion_rate: 0.035,
    avg_ltv: 350000,
    estimated_revenue: (invLoy ?? 0) * 0.035 * 350000,
    recommended_treatment: 'SHOW_ANNUAL',
  });

  // Registered Non-Subscribers
  const { count: regNonSub } = await supabaseAdmin
    .from('readers')
    .select('*', { count: 'exact', head: true })
    .eq('identity_status', 'REGISTERED')
    .eq('subscription_status', 'NONE');

  segments.push({
    name: 'Registered Non-Subscribers',
    key: 'registered_non_subs',
    count: regNonSub ?? 0,
    conversion_rate: 0.012,
    avg_ltv: 120000,
    estimated_revenue: (regNonSub ?? 0) * 0.012 * 120000,
    recommended_treatment: 'SHOW_REGISTRATION',
  });

  return segments;
}

export async function getRecentDecisions(limit: number = 20) {
  const { data } = await supabaseAdmin
    .from('decisions')
    .select(`
      id,
      reader_id,
      timestamp,
      selected_action,
      confidence,
      reason_codes
    `)
    .order('timestamp', { ascending: false })
    .limit(limit);

  // Fetch reader info separately
  const readerIds = [...new Set((data ?? []).map((d) => d.reader_id))];
  if (readerIds.length === 0) return [];

  const { data: readers } = await supabaseAdmin
    .from('readers')
    .select('id, anonymous_id, external_user_id, subscription_status')
    .in('id', readerIds);

  const readerMap = new Map((readers ?? []).map((r) => [r.id, r]));

  return (data ?? []).map((d) => ({
    ...d,
    readers: readerMap.get(d.reader_id),
  }));
}

export async function getRevenueAttribution(days: number = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const { data: conversions } = await supabaseAdmin
    .from('conversions')
    .select('revenue, decision_id, experiment_id')
    .eq('conversion_type', 'subscription')
    .gte('occurred_at', since.toISOString());

  let directRevenue = 0;
  let experimentRevenue = 0;
  let assistedRevenue = 0;

  for (const conv of conversions ?? []) {
    const revenue = conv.revenue ?? 0;
    if (conv.experiment_id) {
      experimentRevenue += revenue;
    } else if (conv.decision_id) {
      assistedRevenue += revenue;
    } else {
      directRevenue += revenue;
    }
  }

  const total = directRevenue + experimentRevenue + assistedRevenue;

  return {
    total_revenue: total,
    direct_revenue: directRevenue,
    experiment_revenue: experimentRevenue,
    assisted_revenue: assistedRevenue,
    experiment_percentage: total > 0 ? experimentRevenue / total : 0,
    assisted_percentage: total > 0 ? assistedRevenue / total : 0,
    direct_percentage: total > 0 ? directRevenue / total : 0,
  };
}

export async function getActiveExperiments() {
  const { data } = await supabaseAdmin
    .from('experiments')
    .select(`
      id,
      name,
      status,
      primary_metric,
      start_at,
      traffic_percentage,
      experiment_variants(id, name, allocation_percentage)
    `)
    .in('status', ['RUNNING', 'PAUSED'])
    .order('created_at', { ascending: false })
    .limit(10);

  return data ?? [];
}
