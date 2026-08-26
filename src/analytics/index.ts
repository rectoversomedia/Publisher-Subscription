// ============================================================
// Analytics Engine — Revenue Intelligence & Attribution
// Uses direct Supabase REST API via fetch for reliability
// ============================================================

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
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return res.json();
}

async function sbCount(table: string, params: string = '') {
  const url = `${SB_URL}/rest/v1/${table}?${params}&select=id`;
  const res = await fetch(url, {
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Prefer': 'count=exact',
    },
  });
  const count = res.headers.get('content-range')?.split('/').pop();
  return count ? parseInt(count) : 0;
}

export async function getDashboardKPIs() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalReaders,
    newSubs30d,
    activeSubs,
    knownReaders,
    conversionsData,
    highPropensity,
    atRisk,
    highPropNonSubs,
    ltvRows,
  ] = await Promise.all([
    sbCount('readers', ''),
    sbCount('readers', `subscription_status=eq.ACTIVE&subscription_started_at=gte.${thirtyDaysAgo}`),
    sbCount('readers', 'subscription_status=eq.ACTIVE'),
    sbCount('readers', 'identity_status=neq.ANONYMOUS'),
    sbQuery('conversions', `conversion_type=eq.subscription&occurred_at=gte.${thirtyDaysAgo}&select=revenue`),
    sbCount('reader_features', 'subscription_propensity=gte.60'),
    sbCount('reader_features', 'churn_risk=gte.75'),
    sbQuery('reader_features', `subscription_propensity=gte.60&select=predicted_ltv&limit=10000`),
    sbQuery('reader_features', `predicted_ltv=gt.0&select=predicted_ltv&limit=1000`),
  ]);

  const totalRevenue30d = (conversionsData as Array<{revenue: number}>)
    .reduce((sum, c) => sum + (c.revenue ?? 0), 0);
  const totalConversions30d = (conversionsData as Array<unknown>).length;
  const subscriptionConversion = knownReaders > 0 ? activeSubs / knownReaders : 0;
  const revenuePer1000 = totalReaders > 0 ? (totalRevenue30d / totalReaders) * 1000 : 0;
  const revenueOpportunity = (highPropNonSubs as Array<{predicted_ltv: number}>)
    .reduce((sum, r) => sum + Number(r.predicted_ltv ?? 0), 0);
  const nonZeroLtv = (ltvRows as Array<{predicted_ltv: number}>)
    .filter((r) => Number(r.predicted_ltv ?? 0) > 0);
  const avgLtv = nonZeroLtv.length > 0
    ? nonZeroLtv.reduce((sum, r) => sum + Number(r.predicted_ltv ?? 0), 0) / nonZeroLtv.length
    : 0;

  return {
    reader_revenue: totalRevenue30d,
    subscription_conversion: subscriptionConversion,
    revenue_per_1000_readers: revenuePer1000,
    high_propensity_audience: highPropensity,
    revenue_opportunity: revenueOpportunity,
    subscribers_at_risk: atRisk,
    active_readers_30d: totalReaders,
    new_subscribers_30d: newSubs30d,
    churned_subscribers_30d: 0,
    total_conversions_30d: totalConversions30d,
    total_revenue_30d: totalRevenue30d,
    avg_ltv: avgLtv,
  };
}

export async function getSubscriptionFunnel() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    uniqueReaders,
    knownReaders,
    paywallExposed,
    offerClicks,
    checkoutStarts,
    subscriptions,
  ] = await Promise.all([
    sbCount('events', `timestamp=gte.${thirtyDaysAgo}`),
    sbCount('readers', 'identity_status=neq.ANONYMOUS'),
    sbCount('events', `event_name=eq.paywall_view&timestamp=gte.${thirtyDaysAgo}`),
    sbCount('events', `event_name=eq.subscription_offer_click&timestamp=gte.${thirtyDaysAgo}`),
    sbCount('events', `event_name=eq.checkout_start&timestamp=gte.${thirtyDaysAgo}`),
    sbCount('conversions', `conversion_type=eq.subscription&occurred_at=gte.${thirtyDaysAgo}`),
  ]);

  return {
    unique_readers: uniqueReaders,
    known_readers: knownReaders,
    paywall_exposed: paywallExposed,
    offer_clicks: offerClicks,
    checkout_starts: checkoutStarts,
    subscriptions,
  };
}

export async function getReaderSegments() {
  const [hiData, atRiskData, invLoyCount, regNonSubCount] = await Promise.all([
    sbQuery('reader_features', 'select=predicted_ltv&limit=10000'),
    sbCount('reader_features', 'churn_risk=gte.75'),
    sbCount('reader_topic_affinity', 'topic=eq.Investigation&score=gte.70'),
    sbCount('readers', 'identity_status=eq.REGISTERED&subscription_status=eq.NONE'),
  ]);

  const hiRows = (hiData as Array<{predicted_ltv: number}>).filter(r => Number(r.predicted_ltv ?? 0) > 200000);

  return [
    {
      name: 'High Intent Non-Subscribers',
      key: 'high_intent_non_subs',
      count: hiRows.length,
      conversion_rate: 0.023,
      avg_ltv: hiRows.length > 0
        ? hiRows.reduce((s, r) => s + Number(r.predicted_ltv ?? 0), 0) / hiRows.length : 0,
      estimated_revenue: hiRows.length * 0.023 * 290000,
      recommended_treatment: 'SHOW_MONTHLY',
    },
    {
      name: 'At-Risk Subscribers',
      key: 'at_risk_subs',
      count: atRiskData,
      conversion_rate: 0,
      avg_ltv: 0,
      estimated_revenue: 0,
      recommended_treatment: 'SHOW_SAVE_OFFER',
    },
    {
      name: 'Investigative Loyalists',
      key: 'investigative_loyalists',
      count: invLoyCount,
      conversion_rate: 0.035,
      avg_ltv: 350000,
      estimated_revenue: invLoyCount * 0.035 * 350000,
      recommended_treatment: 'SHOW_ANNUAL',
    },
    {
      name: 'Registered Non-Subscribers',
      key: 'registered_non_subs',
      count: regNonSubCount,
      conversion_rate: 0.012,
      avg_ltv: 120000,
      estimated_revenue: regNonSubCount * 0.012 * 120000,
      recommended_treatment: 'SHOW_REGISTRATION',
    },
  ];
}

export async function getRecentDecisions(limit: number = 20) {
  const data = await sbQuery('decisions', `select=id,reader_id,timestamp,selected_action,confidence,reason_codes&order=timestamp.desc&limit=${limit}`) as Array<Record<string, unknown>>;
  const readerIds = [...new Set(data.map(d => d.reader_id).filter(Boolean))];
  if (readerIds.length === 0) return [];

  const readersData = await sbQuery('readers', `id=in.(${readerIds.map(id => encodeURIComponent(String(id))).join(',')})&select=id,anonymous_id,external_user_id,subscription_status`) as Array<Record<string, unknown>>;
  const readerMap = new Map(readersData.map(r => [r.id, r]));
  return data.map(d => ({ ...d, readers: readerMap.get(d.reader_id as string) }));
}

export async function getRevenueAttribution(days: number = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const data = await sbQuery('conversions', `conversion_type=eq.subscription&occurred_at=gte.${since}&select=revenue,decision_id,experiment_id`) as Array<{revenue: number; decision_id: string | null; experiment_id: string | null}>;

  let directRevenue = 0, experimentRevenue = 0, assistedRevenue = 0;
  for (const conv of data) {
    const revenue = conv.revenue ?? 0;
    if (conv.experiment_id) experimentRevenue += revenue;
    else if (conv.decision_id) assistedRevenue += revenue;
    else directRevenue += revenue;
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
  const data = await sbQuery('experiments', `status=in.(RUNNING,PAUSED)&select=id,name,status,primary_metric,traffic_percentage&order=created_at.desc&limit=10`) as Array<Record<string, unknown>>;
  return data;
}
