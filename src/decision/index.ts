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
  BusinessExplanation,
  LifecycleStage,
} from '@/domain/types';
import { LIFECYCLE_LABELS } from '@/domain/types';
import { supabaseAdmin } from '@/lib/supabase';

const DEFAULT_THRESHOLDS: DecisionThresholds = {
  very_high_propensity: 80,
  high_propensity: 60,
  low_propensity: 30,
  high_price_sensitivity: 65,
  low_price_sensitivity: 40,
  high_churn_risk: 75,
};

const DEFAULT_FREE_ARTICLE_LIMIT = 3;

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
    // ══════════════════════════════════════════════════════════
    // METERING RULES (priority 0-9)
    // These fire FIRST before any propensity logic
    // ══════════════════════════════════════════════════════════

    // Rule M1: Premium article + meter exhausted → HARD PAYWALL
    {
      id: 'meter-exhausted-hard-paywall',
      priority: 0,
      condition: (ctx) => {
        const limit = ctx.context.free_article_limit ?? DEFAULT_FREE_ARTICLE_LIMIT;
        const read = ctx.features.free_articles_read ?? 0;
        return read >= limit;
      },
      action: 'SHOW_HARD_PAYWALL',
      confidence: 0.95,
      reasonCodes: ['METER_EXHAUSTED', 'PREMIUM_ARTICLE'],
    },

    // Rule M2: Premium article + meter 1 away → SOFT PAYWALL (warning)
    {
      id: 'meter-nearly-exhausted-soft-paywall',
      priority: 1,
      condition: (ctx) => {
        const limit = ctx.context.free_article_limit ?? DEFAULT_FREE_ARTICLE_LIMIT;
        const read = ctx.features.free_articles_read ?? 0;
        return read === limit - 1;
      },
      action: 'SHOW_SOFT_PAYWALL',
      confidence: 0.88,
      reasonCodes: ['METER_NEARLY_EXHAUSTED', 'PREMIUM_ARTICLE'],
    },

    // ══════════════════════════════════════════════════════════
    // CONTENT CONTEXT RULES (priority 5-9)
    // Override or modulate propensity rules based on article type
    // ══════════════════════════════════════════════════════════

    // Rule C1: Investigative/Feature content + high engagement → push to annual
    {
      id: 'investigative-high-engagement-annual',
      priority: 6,
      condition: (ctx) => {
        const cat = ctx.context.category ?? '';
        const topic = ctx.context.topic ?? '';
        const isInvestigative = ['Investigation', 'Feature', 'investigasi', 'feature'].some(
          (kw) => cat.toLowerCase().includes(kw.toLowerCase()) ||
                  topic.toLowerCase().includes(kw.toLowerCase())
        );
        return isInvestigative &&
          ctx.features.engagement_score >= 70 &&
          ctx.features.subscription_propensity >= 60;
      },
      action: 'SHOW_ANNUAL',
      confidence: 0.92,
      reasonCodes: ['INVESTIGATIVE_CONTENT', 'HIGH_INVESTIGATIVE_AFFINITY', 'HIGH_ENGAGEMENT'],
    },

    // Rule C2: Breaking news / daily news → defer monetization (research mode)
    {
      id: 'breaking-news-defer-monetization',
      priority: 7,
      condition: (ctx) => {
        const cat = ctx.context.category ?? '';
        const isBreaking = ['Breaking', 'News', 'berita', 'breaking'].some(
          (kw) => cat.toLowerCase().includes(kw.toLowerCase())
        );
        return isBreaking && ctx.features.subscription_propensity < 70;
      },
      action: 'ALLOW_FREE',
      confidence: 0.95,
      reasonCodes: ['BREAKING_NEWS', 'LOW_SUBSCRIPTION_PROPENSITY'],
    },

    // Rule C3: Opinion/Editorial → escalate to hard paywall if engaged
    {
      id: 'opinion-editorial-escalate',
      priority: 8,
      condition: (ctx) => {
        const cat = ctx.context.category ?? '';
        const isOpinion = ['Opinion', 'Editorial', 'opini', 'editorial'].some(
          (kw) => cat.toLowerCase().includes(kw.toLowerCase())
        );
        return isOpinion && ctx.features.subscription_propensity >= 50;
      },
      action: 'SHOW_HARD_PAYWALL',
      confidence: 0.85,
      reasonCodes: ['OPINION_EDITORIAL', 'PREMIUM_ARTICLE'],
    },

    // ══════════════════════════════════════════════════════════
    // LIFECYCLE MODULATED RULES (priority 10+)
    // Lifecycle stage adjusts behavior within propensity bands
    // ══════════════════════════════════════════════════════════

    // Rule L1: CONVERTING stage → always show hard paywall regardless of propensity
    {
      id: 'lifecycle-converting-hard-paywall',
      priority: 12,
      condition: (ctx) => ctx.features.lifecycle_stage === 'CONVERTING',
      action: 'SHOW_HARD_PAYWALL',
      confidence: 0.9,
      reasonCodes: ['LIFECYCLE_CONVERTING', 'RECENT_PAYWALL_INTERACTION'],
    },

    // Rule L2: HIGH_INTENT + new article view → strong monthly offer
    {
      id: 'lifecycle-high-intent-premium',
      priority: 13,
      condition: (ctx) =>
        ctx.features.lifecycle_stage === 'HIGH_INTENT' &&
        ctx.features.subscription_propensity >= 60,
      action: 'SHOW_MONTHLY',
      confidence: 0.87,
      reasonCodes: ['LIFECYCLE_HIGH_INTENT', 'HIGH_SUBSCRIPTION_PROPENSITY'],
    },

    // Rule L3: AT_RISK → show save offer (prevent churn)
    {
      id: 'lifecycle-at-risk-save',
      priority: 14,
      condition: (ctx) => ctx.features.lifecycle_stage === 'AT_RISK',
      action: 'SHOW_SAVE_OFFER',
      confidence: 0.88,
      reasonCodes: ['LIFECYCLE_AT_RISK', 'HIGH_CHURN_RISK'],
    },

    // ══════════════════════════════════════════════════════════
    // SUBSCRIBER LIFECYCLE RULES (priority 15-20)
    // ══════════════════════════════════════════════════════════

    // Rule 1: Active subscriber — never show acquisition
    {
      id: 'active-subscriber-no-acquisition',
      priority: 15,
      condition: (ctx) => ctx.reader.subscription_status === 'ACTIVE',
      action: 'NO_ACTION',
      confidence: 1.0,
      reasonCodes: ['ACTIVE_SUBSCRIBER'],
    },

    // Rule 2: CRITICAL churn risk — show retention
    {
      id: 'high-churn-retention',
      priority: 16,
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
      priority: 17,
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
      priority: 18,
      condition: (ctx) =>
        (ctx.reader.subscription_status === 'EXPIRED' ||
         ctx.reader.subscription_status === 'CANCELLED') &&
        ctx.features.engagement_score > 60,
      action: 'SHOW_WINBACK',
      confidence: 0.78,
      reasonCodes: ['EXPIRED_SUBSCRIBER', 'HIGH_ENGAGEMENT', 'FORMER_SUBSCRIBER'],
    },

    // ══════════════════════════════════════════════════════════
    // PROPENSITY-BASED RULES (priority 30+)
    // ══════════════════════════════════════════════════════════

    // Rule 5: Very low propensity — allow free or newsletter
    {
      id: 'low-propensity-allow',
      priority: 30,
      condition: (ctx) =>
        ctx.features.subscription_propensity < ctx.thresholds.low_propensity,
      action: 'ALLOW_FREE',
      confidence: 0.9,
      reasonCodes: ['LOW_SUBSCRIPTION_PROPENSITY', 'NEW_READER'],
    },

    // Rule 6: Newsletter gate for medium-low propensity
    {
      id: 'medium-low-propensity-newsletter',
      priority: 31,
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
      priority: 32,
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
      priority: 40,
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
      priority: 41,
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
      priority: 50,
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
      priority: 51,
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
      priority: 42,
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
      priority: 19,
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
    // ── Metering ───────────────────────────────────────────
    METER_EXHAUSTED: 'Free article limit exhausted',
    METER_NEARLY_EXHAUSTED: 'Free article limit nearly exhausted',
    METER_UNDER_LIMIT: 'Within free article limit',
    // ── Lifecycle ─────────────────────────────────────────
    LIFECYCLE_NEW: 'Lifecycle: New Reader',
    LIFECYCLE_CASUAL: 'Lifecycle: Casual Reader',
    LIFECYCLE_ENGAGED: 'Lifecycle: Engaged Reader',
    LIFECYCLE_HIGH_INTENT: 'Lifecycle: High Intent',
    LIFECYCLE_CONVERTING: 'Lifecycle: Ready to Convert',
    LIFECYCLE_AT_RISK: 'Lifecycle: At Risk',
    LIFECYCLE_LAPSED: 'Lifecycle: Lapsed',
    LIFECYCLE_WINBACK: 'Lifecycle: Winback',
    // ── Content Context ───────────────────────────────────
    INVESTIGATIVE_CONTENT: 'Investigative or Feature content',
    BREAKING_NEWS: 'Breaking news article',
    OPINION_EDITORIAL: 'Opinion or Editorial content',
    PREMIUM_ARTICLE: 'Premium article',
    FREE_ARTICLE: 'Free article',
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

// ── Business Language Explanation ─────────────────────────────

export function explainDecisionBusiness(
  result: DecisionResult,
  features: ReaderFeature
): BusinessExplanation {
  const lifecycleStage = features.lifecycle_stage ?? 'CASUAL';
  const lifecycleLabel = LIFECYCLE_LABELS[lifecycleStage] ?? lifecycleStage;

  const freeLimit = features.free_articles_read ?? 0;
  const meterLimit = 3;
  const meterPct = Math.min(100, Math.round((freeLimit / meterLimit) * 100));

  // ── Narrative summary based on action + lifecycle ──────────
  let summary = '';
  switch (result.action) {
    case 'ALLOW_FREE':
      if (lifecycleStage === 'NEW') {
        summary = `Pembaca baru datang ke Tempo untuk pertama kali. Biarkan membaca gratis untuk membangun kesan pertama yang baik — ${lifecycleLabel}.`;
      } else {
        summary = `Pembaca di tahap ${lifecycleLabel} sedang dalam perjalanan menuju langganan. Beri akses gratis sambil terus membangun engagement.`;
      }
      break;
    case 'SHOW_SOFT_PAYWALL':
      summary = `Pembaca sudah membaca ${freeLimit} dari ${meterLimit} artikel gratis. Tampilkan soft paywall untuk memberi tahu bahwa artikel premium berbayar — namun masih ada ruang untuk conversion tanpa mengunci akses.`;
      break;
    case 'SHOW_HARD_PAYWALL':
      if (freeLimit >= meterLimit) {
        summary = `Batas artikel gratis sudah tercapai (${freeLimit}/${meterLimit}). Pembaca harus upgrade ke Tempo+ untuk terus mengakses artikel premium.`;
      } else {
        summary = `Pembaca di tahap ${lifecycleLabel} sudah menunjukkan intent tinggi — langsung tunjukkan hard paywall untuk mendorong konversi.`;
      }
      break;
    case 'SHOW_MONTHLY':
      summary = `Pembaca di tahap ${lifecycleLabel} dengan propensity tinggi menunjukkan kesiapan untuk subscribe. Tawarkan Tempo+ Monthly — Rp 64.000/bulan — dengan pitch akses tak terbatas ke seluruh konten premium.`;
      break;
    case 'SHOW_ANNUAL':
      summary = `Pembaca sangat engaged dan siap untuk komitmen jangka panjang. Tawarkan Tempo+ Annual — paket terbaik untuk pembaca setia yang sudah consume banyak konten premium.`;
      break;
    case 'SHOW_TRIAL':
      summary = `Pembaca menunjukkan minat tapi sensitif terhadap harga. Free trial 7 hari memberikan pengalaman langsung tanpa risiko — konversi trial-to-paid lebih tinggi dari acquisition baru.`;
      break;
    case 'SHOW_SAVE_OFFER':
      summary = `Pembaca pernah hampir checkout tapi tidak selesai — risiko churn tinggi jika tidak ditangani sekarang. Tawarkan save offer (diskon khusus) sebelum mereka pergi.`;
      break;
    case 'SHOW_WINBACK':
      summary = `Mantan pelanggan Tempo+ yang sebelumnya sudah churn tapi masih engaged dengan konten. Target winback campaign — mereka sudah mengenal value Tempo+, tinggal kita tawarkan alasan untuk kembali.`;
      break;
    case 'SHOW_REGISTRATION':
      summary = `Pembaca yang sudah cukup engaged tapi belum teridentifikasi. Minta registration untuk membangun hubungan lebih dalam dan membuka path menuju subscription.`;
      break;
    case 'SHOW_NEWSLETTER_GATE':
      summary = `Pembaca baru yang tertarik tapi belum siap subscribe. Newsletter adalah langkah pertama untuk membangun hubungan jangka panjang.`;
      break;
    case 'NO_ACTION':
      summary = `Pembaca sudah aktif subscribe Tempo+. Tidak perlu干预 — fokus ke churn prevention jika churn risk meningkat.`;
      break;
    default:
      summary = `Revenue Brain merekomendasikan ${result.action} untuk pembaca di tahap ${lifecycleLabel}.`;
  }

  // ── whyNow: what triggered this decision right now ────────
  let whyNow = '';
  const codes = result.reason_codes;
  if (codes.includes('METER_EXHAUSTED')) {
    whyNow = `Pembaca sudah menghabiskan ${freeLimit} artikel gratis hari ini. Ini adalah momen kritis untuk mengunci conversion sebelum mereka pergi.`;
  } else if (codes.includes('METER_NEARLY_EXHAUSTED')) {
    whyNow = `Artikel terakhir gratis — selanjutnya akan kena hard paywall. Ini adalah jendela terakhir untuk soft conversion.`;
  } else if (codes.includes('LIFECYCLE_CONVERTING')) {
    whyNow = `Pembaca sudah berinteraksi dengan paywall berkali-kali tanpa convert. Mereka di tahap Ready to Convert — momentum harus ditangkap sekarang.`;
  } else if (codes.includes('LIFECYCLE_HIGH_INTENT')) {
    whyNow = `Subscription propensity tinggi terdeteksi. Pembaca sudah menunjukkan intent untuk subscribe — tangkap sebelum mereka mencari alternatif.`;
  } else if (codes.includes('RECENT_CHECKOUT_ABANDONMENT')) {
    whyNow = `Checkout started tapi tidak selesai. Ini adalah sinyal churn paling kuat — intervensi save offer harus dilakukan SEKARANG.`;
  } else if (codes.includes('HIGH_CHURN_RISK')) {
    whyNow = `Churn risk meningkat dalam 7 hari terakhir. Tanpa intervensi, kemungkinan churn dalam 30 hari sangat tinggi.`;
  } else if (codes.includes('INVESTIGATIVE_CONTENT')) {
    whyNow = `Pembaca sedang membaca investigative content — jenis artikel yang paling sering mendorong subscription. Manfaatkan momentum ini.`;
  } else if (codes.includes('FORMER_SUBSCRIBER')) {
    whyNow = `Mantan pelanggan terdeteksi. Mereka sudah tahu value Tempo+ — winback offer memiliki conversion rate lebih tinggi dari acquisition baru.`;
  } else {
    whyNow = `Berdasarkan ${lifecycleLabel} + engagement score ${features.engagement_score ?? 0}/100, waktu yang tepat untuk action ini.`;
  }

  // ── whatToSay: pitch angle for the sales/copy team ────────
  let whatToSay = '';
  switch (result.action) {
    case 'SHOW_MONTHLY':
      whatToSay = '"Dengan Rp 64.000/bulan, Anda dapat mengakses seluruh investigative report, analisis mendalam, dan konten premium Tempo+ tanpa batas. Murah dari一杯 kopi sehari."';
      break;
    case 'SHOW_ANNUAL':
      whatToSay = '"Paket annual adalah pilihan terbaik untuk pembaca setia. Hemat 2 bulan — akses tak terbatas ke seluruh arsip dan konten baru setiap hari."';
      break;
    case 'SHOW_TRIAL':
      whatToSay = '"Coba Tempo+ gratis 7 hari. Tidak ada kartu kredit needed. Rasakan sendiri investigative journalism yang bikin beda."';
      break;
    case 'SHOW_SAVE_OFFER':
      whatToSay = '"Kami sengaja tawarkan harga khusus untuk Anda — diskon 30% untuk bulan pertama. Jangan sampai kehilangan akses ke konten yang sudah Anda andalkan."';
      break;
    case 'SHOW_WINBACK':
      whatToSay = '"Kami rindu Anda. Kembali ke Tempo+ dengan harga khusus former subscriber — akses penuh investigative journalism untuk Rp 49.000/bulan."';
      break;
    case 'SHOW_SOFT_PAYWALL':
      whatToSay = '"Anda sudah membaca 3 artikel gratis. Subscribe Tempo+ untuk akses tak terbatas ke investigative report dan analisis mendalam."';
      break;
    case 'SHOW_HARD_PAYWALL':
      whatToSay = '"Artikel ini eksklusif untuk subscriber Tempo+. Subscribe sekarang untuk akses penuh dan mendukung journalism yang independen."';
      break;
    default:
      whatToSay = `Rekomendasikan ${result.action} sesuai strategi subscription untuk pembaca ${lifecycleLabel}.`;
  }

  // ── risk: what could go wrong ─────────────────────────────
  let risk = '';
  if (result.action === 'ALLOW_FREE' && lifecycleStage === 'HIGH_INTENT') {
    risk = 'Risiko: Pembaca sudah high intent tapi tidak ditargetkan. Setiap hari tanpa paywall = opportunity cost subscription. Pertimbangkan untuk menampilkan offer即使是 free reader.';
  } else if (result.action === 'SHOW_HARD_PAYWALL' && features.engagement_score < 50) {
    risk = 'Risiko: Hard paywall terlalu agresif untuk reader dengan engagement rendah. Bisa menyebabkan bounce dan kehilangan pembaca potensial.';
  } else if (result.action === 'NO_ACTION' && (features.churn_risk ?? 0) > 60) {
    risk = 'Risiko CRITICAL: Subscriber aktif dengan churn risk tinggi tidak di-intervensi. Tanpa save offer, churn dalam 14 hari sangat mungkin.';
  } else if (result.action === 'SHOW_WINBACK' && freeLimit < meterLimit) {
    risk = 'Risiko: Winback effort sia-sia jika pembaca belum kembali ke konten. Tunggu engagement signal sebelum mengirim winback offer.';
  } else {
    risk = 'Risiko minimal — keputusan sudah dimoderasi oleh lifecycle stage dan propensity score.';
  }

  return {
    summary,
    whyNow,
    whatToSay,
    risk,
    lifecycleStage,
    meterPosition: { current: freeLimit, limit: meterLimit },
  };
}
