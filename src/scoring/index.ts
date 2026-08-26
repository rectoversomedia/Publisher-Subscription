// ============================================================
// Engagement Score Calculator
// Score: 0-100
// ============================================================

import type { ReaderFeature, ScoringWeights } from '@/domain/types';

const DEFAULT_WEIGHTS: ScoringWeights = {
  engagement_recency: 20,
  engagement_frequency: 20,
  engagement_depth: 20,
  engagement_completion: 15,
  engagement_premium: 15,
  engagement_consistency: 10,
};

export function calculateEngagementScore(
  features: Partial<ReaderFeature>,
  weights: Partial<ScoringWeights> = {}
): number {
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  const total = w.engagement_recency + w.engagement_frequency + w.engagement_depth +
                w.engagement_completion + w.engagement_premium + w.engagement_consistency;

  if (total === 0) return 0;

  // Recency: 20% — how recently they visited
  const recencyScore = Math.max(0, 100 - (features.days_since_last_visit ?? 0) * 5);

  // Frequency: 20% — how many sessions in 30 days
  const frequencyScore = Math.min(100, (features.sessions_30d ?? 0) * 3.3);

  // Depth: 20% — average scroll depth per session
  const depthScore = (features.avg_scroll_depth ?? 0);

  // Completion: 15% — article completion rate
  const completionScore = (features.avg_completion_rate ?? 0) * 100;

  // Premium engagement: 15% — premium articles consumed
  const premiumScore = Math.min(100, (features.premium_articles_30d ?? 0) * 10);

  // Consistency: 10% — returning vs one-time visitor
  const sessions7d = features.sessions_7d ?? 0;
  const sessions30d = features.sessions_30d ?? 1;
  const expectedWeekly = sessions30d / 4;
  const consistencyScore = expectedWeekly > 0
    ? Math.min(100, (sessions7d / expectedWeekly) * 100)
    : 0;

  const score = (
    (recencyScore * w.engagement_recency) +
    (frequencyScore * w.engagement_frequency) +
    (depthScore * w.engagement_depth) +
    (completionScore * w.engagement_completion) +
    (premiumScore * w.engagement_premium) +
    (consistencyScore * w.engagement_consistency)
  ) / total;

  return Math.round(Math.min(100, Math.max(0, score)));
}

// ============================================================
// Subscription Propensity Calculator
// Score: 0-100 | Band: LOW / MEDIUM / HIGH / VERY_HIGH
// ============================================================

interface PropensitySignals {
  is_registered: boolean;
  has_newsletter: boolean;
  premium_reads_30d: number;
  avg_completion_rate: number;
  has_clicked_paywall: boolean;
  has_started_checkout: boolean;
  is_former_subscriber: boolean;
  engagement_score: number;
  sessions_30d: number;
  content_loyalty: number;
  is_anonymous: boolean;
  days_since_last_visit: number;
}

export function calculateSubscriptionPropensity(
  signals: PropensitySignals,
  features: Partial<ReaderFeature>
): number {
  let score = 0;

  // Identity signals
  if (signals.is_registered) score += 20;
  if (signals.has_newsletter) score += 15;

  // Behavioral signals
  score += Math.min(15, signals.premium_reads_30d * 1.5);
  if (signals.avg_completion_rate > 0.7) score += 10;
  if (signals.has_clicked_paywall) score += 15;
  if (signals.has_started_checkout) score += 20;
  if (signals.is_former_subscriber) score += 25;

  // Engagement signals
  if (signals.engagement_score >= 70) score += 10;
  if (signals.sessions_30d >= 10) score += 5;
  if (signals.content_loyalty >= 60) score += 5;

  // Returning visitor bonus
  if (!signals.is_anonymous && signals.days_since_last_visit <= 3) score += 5;

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ============================================================
// Price Sensitivity Calculator
// Score: 0-100 | 0 = not price sensitive, 100 = very price sensitive
// ============================================================

interface PriceSensitivitySignals {
  checkout_abandons: number;
  has_promo_history: boolean;
  has_full_price_history: boolean;
  has_annual_subscription: boolean;
  subscription_propensity: number;
  price_sensitivity_history?: number;
}

export function calculatePriceSensitivity(
  signals: PriceSensitivitySignals,
  features: Partial<ReaderFeature>
): number {
  let score = 50; // baseline neutral

  // Negative signals (increases price sensitivity)
  score += Math.min(30, signals.checkout_abandons * 15);
  if (signals.has_promo_history) score += 15;

  // Positive signals (decreases price sensitivity)
  if (signals.has_full_price_history) score -= 20;
  if (signals.has_annual_subscription) score -= 15;
  if (signals.subscription_propensity >= 80) score -= 10;

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ============================================================
// Churn Risk Calculator
// Score: 0-100 | For active subscribers only
// ============================================================

interface ChurnSignals {
  subscription_status: string;
  sessions_7d: number;
  sessions_30d: number;
  articles_7d: number;
  articles_30d: number;
  days_since_last_visit: number;
  is_newsletter_inactive: boolean;
  renewal_in_7_days: boolean;
  subscription_expires_at?: string | null;
}

export function calculateChurnRisk(
  signals: ChurnSignals,
  features: Partial<ReaderFeature>
): number {
  if (signals.subscription_status !== 'ACTIVE') return 0;

  let score = 0;

  // Session decline signal
  const expectedWeeklySessions = signals.sessions_30d / 4;
  if (expectedWeeklySessions > 0 && signals.sessions_7d < expectedWeeklySessions * 0.5) {
    score += 30;
  } else if (expectedWeeklySessions > 0 && signals.sessions_7d < expectedWeeklySessions * 0.75) {
    score += 15;
  }

  // Recency signal
  if (signals.days_since_last_visit > 14) score += 30;
  else if (signals.days_since_last_visit > 7) score += 20;
  else if (signals.days_since_last_visit > 3) score += 10;

  // Article consumption decline
  const expectedWeeklyArticles = signals.articles_30d / 4;
  if (expectedWeeklyArticles > 0 && signals.articles_7d < expectedWeeklyArticles * 0.5) {
    score += 20;
  }

  // Newsletter inactivity
  if (signals.is_newsletter_inactive) score += 10;

  // Renewal proximity (high churn risk if about to renew and engagement is low)
  if (signals.renewal_in_7_days) score += 10;

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ============================================================
// Estimated LTV Calculator
// Labeled as "Estimated" — heuristic only
// ============================================================

interface LTvSignals {
  monthly_price: number;
  engagement_score: number;
  subscription_propensity: number;
  churn_risk: number;
  is_annual: boolean;
}

export function calculateEstimatedLTV(signals: LTvSignals): number {
  const { monthly_price, engagement_score, subscription_propensity, churn_risk, is_annual } = signals;

  // Base monthly revenue
  const base_revenue = is_annual ? monthly_price * 12 : monthly_price;

  // Retention multiplier based on engagement (1x to 4x)
  const retention_multiplier = 1 + (engagement_score / 100) * 3;

  // Churn adjustment (-50% if high churn risk)
  const churn_adjustment = 1 - (churn_risk / 200);

  // Upsell potential based on propensity
  const upsell_potential = (subscription_propensity / 100) * monthly_price * 6;

  const estimated_ltv = (base_revenue * retention_multiplier * churn_adjustment) + upsell_potential;

  return Math.round(Math.max(0, estimated_ltv));
}

// ============================================================
// Topic Affinity Calculator
// ============================================================

export interface TopicAffinityInput {
  topic: string;
  article_count: number;
  completion_rate: number;
  is_premium: boolean;
  is_repeat: boolean;
  recency_weight: number; // 0-1, 1 = very recent
}

export function calculateTopicAffinity(inputs: TopicAffinityInput[]): Map<string, number> {
  const affinities = new Map<string, number>();

  for (const input of inputs) {
    const base = Math.min(100, input.article_count * 5);
    const completion_bonus = input.completion_rate * 20;
    const premium_bonus = input.is_premium ? 15 : 0;
    const repeat_bonus = input.is_repeat ? 10 : 0;
    const recency_bonus = input.recency_weight * 15;

    const score = base + completion_bonus + premium_bonus + repeat_bonus + recency_bonus;
    affinities.set(input.topic, Math.min(100, Math.round(score)));
  }

  return affinities;
}

// ============================================================
// Full Feature Recalculation
// ============================================================

export function recalculateAllScores(
  features: Partial<ReaderFeature>,
  signals: {
    propensity: PropensitySignals;
    churn: ChurnSignals;
    price: PriceSensitivitySignals;
    ltv: LTvSignals;
  }
): Partial<ReaderFeature> {
  const engagement = calculateEngagementScore(features);
  const propensity = calculateSubscriptionPropensity(signals.propensity, features);
  const priceSensitivity = calculatePriceSensitivity(signals.price, features);
  const churnRisk = calculateChurnRisk(signals.churn, features);
  const ltv = calculateEstimatedLTV({ ...signals.ltv, engagement_score: engagement, subscription_propensity: propensity, churn_risk: churnRisk });

  // Content loyalty = engagement * topic breadth
  const topicBreadth = features.registrations ?? 0;
  const contentLoyalty = Math.round((engagement * Math.min(100, topicBreadth * 5)) / 100);

  return {
    ...features,
    engagement_score: engagement,
    subscription_propensity: propensity,
    price_sensitivity: priceSensitivity,
    content_loyalty: contentLoyalty,
    churn_risk: churnRisk,
    predicted_ltv: ltv,
  };
}
