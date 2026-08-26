// ============================================================
// Revenue Decision Engine
// Powered by Rectoverso
// ============================================================

import type {
  ReaderFeature,
  ReaderProfile,
  DecisionThresholds,
  RevenueAction,
  ReasonCode,
  Offer,
  ScoreSnapshot,
  DecisionContext,
  DecisionResult,
  PropensityBand,
  getPropensityBand,
} from '@/domain/types';
import { supabaseAdmin } from '@/lib/supabase';

const DEFAULT_THRESHOLDS: DecisionThresholds = {
  very_high_propensity: 80,
  high_propensity: 60,
  low_propensity: 30,
  high_price_sensitivity: 65,
  low_price_sensitivity: 40,
  high_churn_risk: 75,
};

// ── Rule Definition ─────────────────────────────────────────

interface DecisionRule {
  id: string;
  priority: number;
  condition: (ctx: RuleContext) => boolean;
  action: RevenueAction;
  offerPlanType?: string;
  confidence: number;
  reasonCodes: ReasonCode[];
  expectedValue?: (ctx: RuleContext) => number;
}

interface RuleContext {
  reader: ReaderProfile;
  features: ReaderFeature;
  context: DecisionContext;
  availableOffers: Offer[];
  thresholds: DecisionThresholds;
}

// ── Default Rules ───────────────────────────────────────────

function buildRules(): DecisionRule[] {
  return [
    // Rule 1: Active subscriber — never show acquisition
    {
      id: 'active-subscriber-no-acquisition',
      priority: 1,
      condition: (ctx) => ctx.reader.subscription_status === 'ACTIVE',
      action: 'NO_ACTION',
      confidence: 1.0,
      reasonCodes: ['ACTIVE_SUBSCRIBER'],
    },

    // Rule 2: CRITICAL churn risk — show retention
    {
      id: 'high-churn-retention',
      priority: 2,
      condition: (ctx) =>
        ctx.reader.subscription_status === 'ACTIVE' &&
        ctx.features.churn_risk >= ctx.thresholds.high_churn_risk,
      action: 'SHOW_SAVE_OFFER',
      confidence: 0.85,
      reasonCodes: ['HIGH_CHURN_RISK', 'ACTIVE_SUBSCRIBER'],
    },

    // Rule 3: Renewal proximity + declining engagement
    {
      id: 'renewal-proximity',
      priority: 3,
      condition: (ctx) =>
        ctx.reader.subscription_status === 'ACTIVE' &&
        ctx.features.churn_risk >= 60 &&
        ctx.features.sessions_7d < 2,
      action: 'SHOW_RENEWAL',
      confidence: 0.8,
      reasonCodes: ['RENEWAL_PROXIMITY', 'HIGH_CHURN_RISK', 'LOW_ENGAGEMENT'],
    },

    // Rule 4: Expired subscriber with high engagement — winback
    {
      id: 'winback-engaged',
      priority: 4,
      condition: (ctx) =>
        (ctx.reader.subscription_status === 'EXPIRED' ||
         ctx.reader.subscription_status === 'CANCELLED') &&
        ctx.features.engagement_score > 60,
      action: 'SHOW_WINBACK',
      confidence: 0.78,
      reasonCodes: ['EXPIRED_SUBSCRIBER', 'HIGH_ENGAGEMENT', 'FORMER_SUBSCRIBER'],
    },

    // Rule 5: Very low propensity — allow free or newsletter
    {
      id: 'low-propensity-allow',
      priority: 10,
      condition: (ctx) =>
        ctx.features.subscription_propensity < ctx.thresholds.low_propensity,
      action: 'ALLOW_FREE',
      confidence: 0.9,
      reasonCodes: ['LOW_SUBSCRIPTION_PROPENSITY', 'NEW_READER'],
    },

    // Rule 6: Newsletter gate for medium-low propensity
    {
      id: 'medium-low-propensity-newsletter',
      priority: 11,
      condition: (ctx) =>
        ctx.features.subscription_propensity >= ctx.thresholds.low_propensity &&
        ctx.features.subscription_propensity < 45 &&
        ctx.reader.identity_status === 'ANONYMOUS',
      action: 'SHOW_NEWSLETTER_GATE',
      confidence: 0.75,
      reasonCodes: ['MEDIUM_SUBSCRIPTION_PROPENSITY', 'ANONYMOUS_READER'],
    },

    // Rule 7: Medium propensity — registration
    {
      id: 'medium-propensity-registration',
      priority: 20,
      condition: (ctx) =>
        ctx.features.subscription_propensity >= ctx.thresholds.low_propensity &&
        ctx.features.subscription_propensity < ctx.thresholds.high_propensity &&
        ctx.reader.identity_status === 'ANONYMOUS',
      action: 'SHOW_REGISTRATION',
      confidence: 0.78,
      reasonCodes: ['MEDIUM_SUBSCRIPTION_PROPENSITY', 'ANONYMOUS_READER', 'RETURNING_READER'],
    },

    // Rule 8: High propensity + high price sensitivity → trial or monthly intro
    {
      id: 'high-propensity-high-price-sensitivity',
      priority: 30,
      condition: (ctx) =>
        ctx.features.subscription_propensity >= ctx.thresholds.high_propensity &&
        ctx.features.subscription_propensity < ctx.thresholds.very_high_propensity &&
        ctx.features.price_sensitivity >= ctx.thresholds.high_price_sensitivity,
      action: 'SHOW_TRIAL',
      confidence: 0.8,
      reasonCodes: ['HIGH_SUBSCRIPTION_PROPENSITY', 'HIGH_PRICE_SENSITIVITY'],
    },

    // Rule 9: High propensity + low price sensitivity → monthly
    {
      id: 'high-propensity-low-price-sensitivity',
      priority: 31,
      condition: (ctx) =>
        ctx.features.subscription_propensity >= ctx.thresholds.high_propensity &&
        ctx.features.subscription_propensity < ctx.thresholds.very_high_propensity &&
        ctx.features.price_sensitivity < ctx.thresholds.high_price_sensitivity,
      action: 'SHOW_MONTHLY',
      confidence: 0.82,
      reasonCodes: ['HIGH_SUBSCRIPTION_PROPENSITY', 'LOW_PRICE_SENSITIVITY', 'HIGH_ENGAGEMENT'],
    },

    // Rule 10: Very high propensity + very low price sensitivity → annual full price
    {
      id: 'very-high-propensity-annual',
      priority: 40,
      condition: (ctx) =>
        ctx.features.subscription_propensity >= ctx.thresholds.very_high_propensity &&
        ctx.features.price_sensitivity < ctx.thresholds.low_price_sensitivity,
      action: 'SHOW_ANNUAL',
      confidence: 0.88,
      reasonCodes: ['VERY_HIGH_SUBSCRIPTION_PROPENSITY', 'LOW_PRICE_SENSITIVITY', 'PREMIUM_CONTENT_LOYALTY', 'HIGH_ENGAGEMENT'],
    },

    // Rule 11: Very high propensity + medium price sensitivity → annual promo
    {
      id: 'very-high-propensity-annual-promo',
      priority: 41,
      condition: (ctx) =>
        ctx.features.subscription_propensity >= ctx.thresholds.very_high_propensity &&
        ctx.features.price_sensitivity >= ctx.thresholds.low_price_sensitivity &&
        ctx.features.price_sensitivity < ctx.thresholds.high_price_sensitivity,
      action: 'SHOW_MONTHLY',
      confidence: 0.82,
      reasonCodes: ['VERY_HIGH_SUBSCRIPTION_PROPENSITY', 'HIGH_ENGAGEMENT', 'PREMIUM_CONTENT_LOYALTY'],
    },

    // Rule 12: High propensity + recent checkout abandon
    {
      id: 'checkout-abandon-retry',
      priority: 32,
      condition: (ctx) =>
        ctx.features.subscription_propensity >= ctx.thresholds.high_propensity &&
        ctx.features.checkout_starts_30d > 0,
      action: 'SHOW_SAVE_OFFER',
      confidence: 0.75,
      reasonCodes: ['HIGH_SUBSCRIPTION_PROPENSITY', 'RECENT_CHECKOUT_ABANDONMENT'],
    },

    // Rule 13: Former subscriber with high propensity → winback
    {
      id: 'former-subscriber-high-propensity',
      priority: 5,
      condition: (ctx) =>
        ctx.features.former_subscriber &&
        ctx.features.subscription_propensity >= ctx.thresholds.high_propensity,
      action: 'SHOW_WINBACK',
      confidence: 0.8,
      reasonCodes: ['FORMER_SUBSCRIBER', 'HIGH_SUBSCRIPTION_PROPENSITY', 'PREMIUM_CONTENT_LOYALTY'],
    },

    // Rule 14: Fallback — allow free
    {
      id: 'fallback-allow',
      priority: 999,
      condition: () => true,
      action: 'ALLOW_FREE',
      confidence: 0.5,
      reasonCodes: ['LOW_ENGAGEMENT'],
    },
  ];
}

// ── Offer Selection ────────────────────────────────────────

function selectBestOffer(
  action: RevenueAction,
  availableOffers: Offer[]
): Offer | null {
  const planTypeMap: Record<string, string[]> = {
    SHOW_ANNUAL: ['ANNUAL'],
    SHOW_MONTHLY: ['MONTHLY'],
    SHOW_TRIAL: ['TRIAL'],
    SHOW_DAY_PASS: ['DAY_PASS'],
    SHOW_BUNDLE: ['BUNDLE'],
    SHOW_VIP: ['VIP'],
    SHOW_SAVE_OFFER: ['ANNUAL', 'MONTHLY'],
    SHOW_WINBACK: ['MONTHLY', 'ANNUAL'],
  };

  const eligibleTypes = planTypeMap[action];
  if (!eligibleTypes) return null;

  const candidates = availableOffers.filter(
    (o) => o.active && eligibleTypes.includes(o.plan_type)
  );

  if (candidates.length === 0) return null;

  // Pick best offer by expected value (revenue × conversion probability proxy)
  return candidates.sort((a, b) => {
    const aScore = a.price * (1 - a.discount_percentage / 100);
    const bScore = b.price * (1 - b.discount_percentage / 100);
    return bScore - aScore;
  })[0] ?? null;
}

// ── Reason Code Humanization ────────────────────────────────

export function humanizeReasonCodes(codes: ReasonCode[]): string[] {
  const labels: Record<ReasonCode, string> = {
    VERY_HIGH_SUBSCRIPTION_PROPENSITY: 'Very high subscription propensity',
    HIGH_SUBSCRIPTION_PROPENSITY: 'High subscription propensity',
    MEDIUM_SUBSCRIPTION_PROPENSITY: 'Medium subscription propensity',
    LOW_SUBSCRIPTION_PROPENSITY: 'Low subscription propensity',
    LOW_PRICE_SENSITIVITY: 'Low price sensitivity',
    HIGH_PRICE_SENSITIVITY: 'High price sensitivity',
    HIGH_INVESTIGATIVE_AFFINITY: 'High investigative content affinity',
    HIGH_POLITICS_AFFINITY: 'High politics content affinity',
    HIGH_ECONOMY_AFFINITY: 'High economy content affinity',
    HIGH_BUSINESS_AFFINITY: 'High business content affinity',
    FORMER_SUBSCRIBER: 'Former subscriber',
    ACTIVE_SUBSCRIBER: 'Active subscriber',
    EXPIRED_SUBSCRIBER: 'Expired subscriber',
    HIGH_ENGAGEMENT: 'High engagement',
    LOW_ENGAGEMENT: 'Low engagement',
    RECENT_PAYWALL_INTERACTION: 'Recent paywall interaction',
    RECENT_CHECKOUT_ABANDONMENT: 'Recent checkout abandonment',
    HIGH_CHURN_RISK: 'High churn risk',
    RETURNING_READER: 'Returning reader',
    PREMIUM_CONTENT_LOYALTY: 'Premium content loyalty',
    NEW_READER: 'New reader',
    REGISTERED_READER: 'Registered reader',
    ANONYMOUS_READER: 'Anonymous reader',
    TRIAL_ENDING: 'Trial ending soon',
    RENEWAL_PROXIMITY: 'Renewal approaching',
    CONTENT_CLUSTER_MATCH: 'Content cluster match',
    NEWS_MOMENT_DETECTED: 'News moment detected',
  };

  return codes.map((code) => labels[code] ?? code);
}

// ── Main Decision Function ─────────────────────────────────

export async function makeDecision(
  reader: ReaderProfile,
  context: DecisionContext,
  overrides?: { thresholds?: Partial<DecisionThresholds>; executionMode?: string }
): Promise<DecisionResult> {
  const startTime = Date.now();
  const thresholds = { ...DEFAULT_THRESHOLDS, ...overrides?.thresholds };
  const features = reader.features;

  if (!features) {
    // New reader with no features — default allow
    return {
      decision_id: `dec_${Date.now()}`,
      action: 'ALLOW_FREE',
      confidence: 0.5,
      reason_codes: ['NEW_READER'],
      decision_version: 'rules-v1',
    };
  }

  // Fetch available offers
  const { data: offers } = await supabaseAdmin
    .from('offers')
    .select('*')
    .eq('active', true)
    .limit(20);

  const availableOffers = offers ?? [];

  const ruleContext: RuleContext = {
    reader,
    features,
    context,
    availableOffers,
    thresholds,
  };

  const rules = buildRules();

  // Find first matching rule
  const matchedRule = rules
    .sort((a, b) => a.priority - b.priority)
    .find((rule) => rule.condition(ruleContext));

  if (!matchedRule) {
    return {
      decision_id: `dec_${Date.now()}`,
      action: 'ALLOW_FREE',
      confidence: 0.5,
      reason_codes: ['LOW_ENGAGEMENT'],
      decision_version: 'rules-v1',
    };
  }

  const selectedOffer = selectBestOffer(matchedRule.action, availableOffers);

  const decisionId = `dec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  return {
    decision_id: decisionId,
    action: matchedRule.action,
    offer: selectedOffer ?? null,
    confidence: matchedRule.confidence,
    reason_codes: matchedRule.reasonCodes,
    decision_version: 'rules-v1',
    expected_value: matchedRule.expectedValue
      ? matchedRule.expectedValue(ruleContext)
      : selectedOffer
        ? selectedOffer.price * matchedRule.confidence
        : undefined,
  };
}

// ── Persist Decision ───────────────────────────────────────

export async function persistDecision(
  readerId: string,
  result: DecisionResult,
  context: DecisionContext,
  features: ReaderFeature,
  executionMode: string = 'LIVE'
): Promise<string> {
  const scoreSnapshot: ScoreSnapshot = {
    engagement_score: features.engagement_score,
    subscription_propensity: features.subscription_propensity,
    price_sensitivity: features.price_sensitivity,
    content_loyalty: features.content_loyalty,
    churn_risk: features.churn_risk,
    predicted_ltv: features.predicted_ltv,
  };

  const { data, error } = await supabaseAdmin
    .from('decisions')
    .insert({
      reader_id: readerId,
      context,
      selected_action: result.action,
      selected_offer_id: result.offer?.id ?? null,
      score_snapshot: scoreSnapshot,
      reason_codes: result.reason_codes,
      decision_version: result.decision_version,
      confidence: result.confidence,
      execution_mode: executionMode,
      expected_value: result.expected_value ?? null,
      latency_ms: 0,
      is_shadow: executionMode === 'SHADOW',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to persist decision: ${error.message}`);
  return data?.id ?? '';
}

// ── Explain Decision ───────────────────────────────────────

export function explainDecision(result: DecisionResult, features: ReaderFeature): string {
  const humanized = humanizeReasonCodes(result.reason_codes);
  const offerText = result.offer
    ? `${result.offer.name} (Rp ${result.offer.price.toLocaleString('id-ID')})`
    : 'no specific offer';

  const actionLabels: Record<string, string> = {
    ALLOW_FREE: 'Free access',
    SHOW_REGISTRATION: 'Registration wall',
    SHOW_NEWSLETTER_GATE: 'Newsletter signup',
    SHOW_SOFT_PAYWALL: 'Soft paywall',
    SHOW_HARD_PAYWALL: 'Hard paywall',
    SHOW_TRIAL: 'Free trial',
    SHOW_DAY_PASS: 'Day pass',
    SHOW_MONTHLY: 'Monthly subscription',
    SHOW_ANNUAL: 'Annual subscription',
    SHOW_BUNDLE: 'Bundle offer',
    SHOW_VIP: 'VIP membership',
    SHOW_RETENTION_CONTENT: 'Retention content',
    SHOW_RENEWAL: 'Renewal prompt',
    SHOW_SAVE_OFFER: 'Save offer',
    SHOW_WINBACK: 'Winback offer',
    NO_ACTION: 'No action',
  };

  const primaryReasons = humanized
    .filter((r) => !['ACTIVE_SUBSCRIBER', 'EXPIRED_SUBSCRIBER', 'FORMER_SUBSCRIBER', 'NEW_READER', 'ANONYMOUS_READER'].includes(r))
    .slice(0, 4);

  if (primaryReasons.length === 0) {
    return `${actionLabels[result.action] ?? result.action} recommended with ${Math.round(result.confidence * 100)}% confidence.`;
  }

  const reasonText = primaryReasons.join(', ').toLowerCase();
  return `${actionLabels[result.action] ?? result.action} recommended because this reader has ${reasonText}.`;
}
