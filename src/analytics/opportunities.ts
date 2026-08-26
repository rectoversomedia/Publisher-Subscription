// ============================================================
// Opportunity Detection Engine — uses direct Supabase REST API
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
  if (!res.ok) return [];
  return res.json();
}

async function sbInsert(table: string, data: unknown) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(data),
  });
  return res.ok;
}

export async function detectOpportunities() {
  const opportunities = [];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // 1. High propensity readers receiving generic treatment
  const genericHighProp = await sbQuery(
    'decisions',
    `selected_action=in.(ALLOW_FREE,SHOW_NEWSLETTER_GATE)&timestamp=gte.${sevenDaysAgo}&select=reader_id`
  ) as Array<{reader_id: string}>;

  const hpCount = await (async () => {
    const data = await sbQuery('reader_features', 'subscription_propensity=gte.60&select=id&limit=100000') as unknown[];
    return data.length;
  })();

  if (genericHighProp.length > 100) {
    opportunities.push({
      id: `opp_high_prop_generic_${Date.now()}`,
      type: 'high_propensity_generic_offer',
      title: 'High-propensity readers receiving generic treatment',
      description: `${hpCount} readers with high subscription propensity are receiving free access instead of subscription offers.`,
      severity: hpCount > 500 ? 'HIGH' : 'MEDIUM',
      status: 'DETECTED',
      estimated_audience: hpCount,
      estimated_incremental_revenue: hpCount * 290000 * 0.03,
      recommended_action: 'Test personalized monthly vs annual offer for high-propensity readers',
      supporting_metrics: { generic_decisions_7d: genericHighProp.length },
      detected_at: new Date().toISOString(),
      resolved_at: null,
    });
  }

  // 2. High churn risk population
  const atRiskData = await sbQuery('reader_features', 'churn_risk=gte.75&select=predicted_ltv&limit=10000') as Array<{predicted_ltv: number}>;
  const atRiskCount = atRiskData.length;
  const revenueAtRisk = atRiskData.reduce((s, r) => s + Number(r.predicted_ltv ?? 0), 0);

  if (atRiskCount > 0) {
    opportunities.push({
      id: `opp_high_churn_${Date.now()}`,
      type: 'high_churn_population',
      title: 'Subscribers at high churn risk',
      description: `${atRiskCount} active subscribers show high churn risk signals. Revenue at risk: Rp ${(revenueAtRisk / 1000000).toFixed(0)}M.`,
      severity: atRiskCount > 1000 ? 'CRITICAL' : atRiskCount > 500 ? 'HIGH' : 'MEDIUM',
      status: 'DETECTED',
      estimated_audience: atRiskCount,
      estimated_incremental_revenue: revenueAtRisk * 0.3,
      recommended_action: 'Launch retention/save journey with personalized offers',
      supporting_metrics: { revenue_at_risk: revenueAtRisk },
      detected_at: new Date().toISOString(),
      resolved_at: null,
    });
  }

  // 3. Checkout abandonment spike
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const checkoutEvents = await sbQuery(
    'events',
    `event_name=in.(checkout_start,checkout_abandon,subscription_success)&timestamp=gte.${threeDaysAgo}&select=event_name`
  ) as Array<{event_name: string}>;

  if (checkoutEvents.length > 0) {
    const starts = checkoutEvents.filter(e => e.event_name === 'checkout_start').length;
    const abandons = checkoutEvents.filter(e => e.event_name === 'checkout_abandon').length;
    if (starts > 0) {
      const abandonmentRate = abandons / starts;
      if (abandonmentRate > 0.5) {
        opportunities.push({
          id: `opp_abandonment_${Date.now()}`,
          type: 'checkout_abandonment_spike',
          title: 'High checkout abandonment rate',
          description: `Checkout abandonment rate is ${(abandonmentRate * 100).toFixed(0)}% over the last 3 days.`,
          severity: abandonmentRate > 0.7 ? 'HIGH' : 'MEDIUM',
          status: 'DETECTED',
          estimated_audience: abandons,
          estimated_incremental_revenue: abandons * 150000 * 0.15,
          recommended_action: 'Test simplified checkout and offer variants',
          supporting_metrics: { starts, abandons, abandonment_rate: abandonmentRate },
          detected_at: new Date().toISOString(),
          resolved_at: null,
        });
      }
    }
  }

  // Persist new opportunities
  if (opportunities.length > 0) {
    const recentOpp = await sbQuery(
      'opportunities',
      `detected_at=gte.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}&select=type`
    ) as Array<{type: string}>;

    const existingTypes = new Set(recentOpp.map(o => o.type));
    const newOnes = opportunities.filter(o => !existingTypes.has(o.type));
    if (newOnes.length > 0) {
      await sbInsert('opportunities', newOnes);
    }
  }

  return opportunities;
}

export async function getActiveOpportunities() {
  const data = await sbQuery(
    'opportunities',
    `status=in.(DETECTED,INVESTIGATING)&order=detected_at.desc&limit=20`
  );
  return data;
}
