// ============================================================
// Opportunity Detection Engine
// ============================================================

import { supabaseAdmin } from '@/lib/supabase';
import type { Opportunity } from '@/domain/types';

export async function detectOpportunities(): Promise<Opportunity[]> {
  const opportunities: Opportunity[] = [];

  // 1. High propensity readers receiving generic treatment
  const { data: genericHighProp } = await supabaseAdmin
    .from('decisions')
    .select('reader_id, selected_action')
    .in('selected_action', ['ALLOW_FREE', 'SHOW_NEWSLETTER_GATE'])
    .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(5000);

  if (genericHighProp && genericHighProp.length > 100) {
    const { count } = await supabaseAdmin
      .from('reader_features')
      .select('*', { count: 'exact', head: true })
      .gte('subscription_propensity', 60);

    opportunities.push({
      id: `opp_high_prop_generic_${Date.now()}`,
      type: 'high_propensity_generic_offer',
      title: 'High-propensity readers receiving generic treatment',
      description: `${count ?? 0} readers with high subscription propensity are receiving free access or newsletter gates instead of subscription offers. This represents significant lost revenue opportunity.`,
      severity: count && count > 500 ? 'HIGH' : 'MEDIUM',
      status: 'DETECTED',
      estimated_audience: count ?? 0,
      estimated_incremental_revenue: (count ?? 0) * 290000 * 0.03,
      recommended_action: 'Test personalized monthly vs annual offer for high-propensity readers',
      supporting_metrics: {
        generic_decisions_7d: genericHighProp.length,
      },
      detected_at: new Date().toISOString(),
      resolved_at: null,
    });
  }

  // 2. High churn risk population
  const { data: atRiskFeatures } = await supabaseAdmin
    .from('reader_features')
    .select('reader_id, predicted_ltv')
    .gte('churn_risk', 75);

  const atRiskReaderIds = new Set(atRiskFeatures?.map((r) => r.reader_id) ?? []);
  const revenueAtRisk = atRiskFeatures?.reduce((s, r) => s + (r.predicted_ltv ?? 0), 0) ?? 0;
  const atRiskCount = atRiskReaderIds.size;

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
  const { data: checkoutEvents } = await supabaseAdmin
    .from('events')
    .select('event_name, reader_id')
    .in('event_name', ['checkout_start', 'checkout_abandon', 'subscription_success'])
    .gte('timestamp', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());

  if (checkoutEvents) {
    const starts = checkoutEvents.filter((e) => e.event_name === 'checkout_start').length;
    const abandons = checkoutEvents.filter((e) => e.event_name === 'checkout_abandon').length;

    if (starts > 0) {
      const abandonmentRate = abandons / starts;
      if (abandonmentRate > 0.5) {
        opportunities.push({
          id: `opp_abandonment_${Date.now()}`,
          type: 'checkout_abandonment_spike',
          title: 'High checkout abandonment rate',
          description: `Checkout abandonment rate is ${(abandonmentRate * 100).toFixed(0)}% over the last 3 days. ${starts} checkouts started, ${abandons} abandoned.`,
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
    const existing = await supabaseAdmin
      .from('opportunities')
      .select('type, detected_at')
      .gte('detected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const existingTypes = new Set(
      (existing.data ?? []).map((o) => o.type)
    );

    const newOnes = opportunities.filter((o) => !existingTypes.has(o.type));
    if (newOnes.length > 0) {
      await supabaseAdmin.from('opportunities').insert(newOnes);
    }
  }

  return opportunities;
}

export async function getActiveOpportunities(): Promise<Opportunity[]> {
  const { data } = await supabaseAdmin
    .from('opportunities')
    .select('*')
    .in('status', ['DETECTED', 'INVESTIGATING'])
    .order('detected_at', { ascending: false })
    .limit(20);

  return data as unknown as Opportunity[] ?? [];
}
