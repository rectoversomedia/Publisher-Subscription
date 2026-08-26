// ============================================================
// Tempo Reader Revenue Brain — Core Domain Types
// ============================================================

// ── Identity ────────────────────────────────────────────────

export type IdentityStatus = 'ANONYMOUS' | 'REGISTERED' | 'KNOWN';
export type SubscriptionStatus = 'NONE' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'TRIAL' | 'PAUSED';

// ── Reader ──────────────────────────────────────────────────

export interface Reader {
  id: string;
  external_user_id: string | null;
  anonymous_id: string | null;
  email_hash: string | null;
  identity_status: IdentityStatus;
  subscription_status: SubscriptionStatus;
  current_plan_id: string | null;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface ReaderFeature {
  id: string;
  reader_id: string;
  sessions_7d: number;
  sessions_30d: number;
  articles_7d: number;
  articles_30d: number;
  premium_articles_30d: number;
  avg_scroll_depth: number;
  avg_completion_rate: number;
  paywall_views_30d: number;
  offer_clicks_30d: number;
  checkout_starts_30d: number;
  days_since_last_visit: number;
  newsletter_signups: number;
  registrations: number;
  former_subscriber: boolean;
  is_suspected_bot: boolean;
  engagement_score: number;
  subscription_propensity: number;
  price_sensitivity: number;
  content_loyalty: number;
  churn_risk: number;
  predicted_ltv: number;
  updated_at: string;
}

export interface ReaderTopicAffinity {
  id: string;
  reader_id: string;
  topic: string;
  score: number;
  article_count: number;
  last_engaged_at: string;
}

// ── Reader Profile (combined view) ───────────────────────────

export interface ReaderProfile extends Reader {
  features: ReaderFeature | null;
  topic_affinity: ReaderTopicAffinity[];
  latest_decision?: Decision | null;
}

// ── Article ─────────────────────────────────────────────────

export interface Article {
  id: string;
  external_article_id: string | null;
  title: string;
  slug: string;
  category: string;
  topic: string;
  author: string;
  is_premium: boolean;
  published_at: string;
  created_at: string;
}

// ── Event ────────────────────────────────────────────────────

export type EventName =
  | 'page_view' | 'article_view' | 'article_start' | 'article_complete'
  | 'scroll_25' | 'scroll_50' | 'scroll_75' | 'scroll_90'
  | 'paywall_view' | 'paywall_dismiss' | 'paywall_click'
  | 'registration_wall_view' | 'registration_start' | 'registration_complete'
  | 'newsletter_offer_view' | 'newsletter_signup'
  | 'subscription_offer_view' | 'subscription_offer_click'
  | 'checkout_start' | 'checkout_abandon' | 'subscription_success'
  | 'subscription_renewal' | 'subscription_cancel' | 'subscription_expired'
  | 'login' | 'logout'
  | 'push_open' | 'email_open' | 'email_click'
  | 'share' | 'referral_click'
  | 'app_open' | 'session_start' | 'session_end';

export interface Event {
  id: string;
  event_id: string;
  reader_id: string | null;
  anonymous_id: string | null;
  session_id: string;
  event_name: string;
  article_id: string | null;
  timestamp: string;
  source: string;
  metadata: Record<string, unknown>;
}

export interface IngestEvent {
  event_id?: string;
  anonymous_id?: string;
  reader_id?: string;
  session_id: string;
  event: string;
  timestamp?: string;
  properties?: Record<string, unknown>;
}

// ── Scores ──────────────────────────────────────────────────

export interface ScoreSnapshot {
  engagement_score: number;
  subscription_propensity: number;
  price_sensitivity: number;
  content_loyalty: number;
  churn_risk: number;
  predicted_ltv: number;
}

export type PropensityBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type ChurnRiskBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export function getPropensityBand(score: number): PropensityBand {
  if (score >= 80) return 'VERY_HIGH';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

export function getChurnRiskBand(score: number): ChurnRiskBand {
  if (score >= 85) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

// ── Decision ────────────────────────────────────────────────

export type RevenueAction =
  | 'ALLOW_FREE'
  | 'SHOW_REGISTRATION'
  | 'SHOW_NEWSLETTER_GATE'
  | 'SHOW_SOFT_PAYWALL'
  | 'SHOW_HARD_PAYWALL'
  | 'SHOW_TRIAL'
  | 'SHOW_DAY_PASS'
  | 'SHOW_MONTHLY'
  | 'SHOW_ANNUAL'
  | 'SHOW_BUNDLE'
  | 'SHOW_VIP'
  | 'SHOW_RETENTION_CONTENT'
  | 'SHOW_RENEWAL'
  | 'SHOW_SAVE_OFFER'
  | 'SHOW_WINBACK'
  | 'NO_ACTION';

export type ReasonCode =
  | 'VERY_HIGH_SUBSCRIPTION_PROPENSITY' | 'HIGH_SUBSCRIPTION_PROPENSITY'
  | 'LOW_SUBSCRIPTION_PROPENSITY' | 'MEDIUM_SUBSCRIPTION_PROPENSITY'
  | 'LOW_PRICE_SENSITIVITY' | 'HIGH_PRICE_SENSITIVITY'
  | 'HIGH_INVESTIGATIVE_AFFINITY' | 'HIGH_POLITICS_AFFINITY'
  | 'HIGH_ECONOMY_AFFINITY' | 'HIGH_BUSINESS_AFFINITY'
  | 'FORMER_SUBSCRIBER' | 'ACTIVE_SUBSCRIBER' | 'EXPIRED_SUBSCRIBER'
  | 'HIGH_ENGAGEMENT' | 'LOW_ENGAGEMENT'
  | 'RECENT_PAYWALL_INTERACTION' | 'RECENT_CHECKOUT_ABANDONMENT'
  | 'HIGH_CHURN_RISK' | 'RETURNING_READER' | 'PREMIUM_CONTENT_LOYALTY'
  | 'NEW_READER' | 'REGISTERED_READER' | 'ANONYMOUS_READER'
  | 'TRIAL_ENDING' | 'RENEWAL_PROXIMITY'
  | 'CONTENT_CLUSTER_MATCH' | 'NEWS_MOMENT_DETECTED';

export type ExecutionMode = 'SHADOW' | 'CONTROLLED' | 'LIVE';

export interface Decision {
  id: string;
  reader_id: string;
  timestamp: string;
  context: DecisionContext;
  selected_action: RevenueAction;
  selected_offer_id: string | null;
  score_snapshot: ScoreSnapshot;
  reason_codes: ReasonCode[];
  decision_version: string;
  experiment_id: string | null;
  treatment_id: string | null;
  confidence: number | null;
  execution_mode: ExecutionMode;
  existing_treatment: string | null;
  expected_value: number | null;
  latency_ms: number | null;
  is_shadow: boolean;
}

export interface DecisionContext {
  article_id?: string;
  session_id: string;
  platform?: string;
  referrer?: string;
  utm_source?: string;
  category?: string;
  topic?: string;
}

export interface DecisionRequest {
  reader_id: string;
  context: DecisionContext;
}

export interface DecisionResult {
  decision_id: string;
  action: RevenueAction;
  offer?: Offer | null;
  confidence: number;
  reason_codes: ReasonCode[];
  experiment?: { id: string; name: string } | null;
  decision_version: string;
  expected_value?: number;
}

// ── Offer ───────────────────────────────────────────────────

export interface Offer {
  id: string;
  name: string;
  plan_type: string;
  price: number;
  original_price: number | null;
  billing_period: string;
  offer_type: string;
  discount_percentage: number;
  active: boolean;
  description: string | null;
  features: unknown[];
  created_at: string;
  updated_at: string;
}

// ── Experiment ──────────────────────────────────────────────

export type ExperimentStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

export interface Experiment {
  id: string;
  name: string;
  hypothesis: string | null;
  description: string | null;
  status: ExperimentStatus;
  primary_metric: string;
  guardrail_metrics: string[];
  start_at: string | null;
  end_at: string | null;
  audience_definition: AudienceDefinition;
  traffic_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface AudienceDefinition {
  propensity_min?: number;
  propensity_max?: number;
  subscription_status?: SubscriptionStatus[];
  identity_status?: IdentityStatus[];
  topics?: string[];
  min_sessions?: number;
}

export interface ExperimentVariant {
  id: string;
  experiment_id: string;
  name: string;
  allocation_percentage: number;
  action: string | null;
  offer_id: string | null;
  configuration: Record<string, unknown>;
  created_at: string;
}

export interface ExperimentAssignment {
  id: string;
  experiment_id: string;
  variant_id: string;
  reader_id: string;
  assigned_at: string;
}

export interface ExperimentResult {
  experiment_id: string;
  variant_id: string;
  exposures: number;
  conversions: number;
  conversion_rate: number;
  revenue: number;
  revenue_per_exposed: number;
  lift_vs_control?: number;
  is_significant?: boolean;
}

// ── Conversion ──────────────────────────────────────────────

export type ConversionType = 'subscription' | 'newsletter' | 'registration' | 'trial_start';

export interface Conversion {
  id: string;
  reader_id: string;
  decision_id: string | null;
  experiment_id: string | null;
  variant_id: string | null;
  offer_id: string | null;
  conversion_type: ConversionType;
  revenue: number;
  occurred_at: string;
}

// ── Opportunity ─────────────────────────────────────────────

export type OpportunityType =
  | 'high_propensity_generic_offer'
  | 'high_propensity_no_offer'
  | 'traffic_spike'
  | 'high_churn_population'
  | 'former_subscriber_reactivation'
  | 'checkout_abandonment_spike'
  | 'paywall_conversion_drop'
  | 'premium_content_conversion_spike'
  | 'content_cluster_high_subscription_affinity';

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  description: string | null;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'DETECTED' | 'INVESTIGATING' | 'ACTION_TAKEN' | 'RESOLVED' | 'DISMISSED';
  estimated_audience: number;
  estimated_incremental_revenue: number;
  recommended_action: string | null;
  supporting_metrics: Record<string, unknown>;
  detected_at: string;
  resolved_at: string | null;
}

// ── Content Metrics ─────────────────────────────────────────

export type ContentClassification = 'TRAFFIC_CONTENT' | 'CONVERSION_CONTENT' | 'RETENTION_CONTENT' | 'BALANCED_CONTENT';

export interface ContentMetric {
  id: string;
  article_id: string;
  pageviews: number;
  unique_readers: number;
  registered_readers: number;
  subscriber_readers: number;
  paywall_exposures: number;
  offer_clicks: number;
  direct_subscriptions: number;
  assisted_subscriptions: number;
  revenue: number;
  estimated_ltv_generated: number;
  subscription_propensity_lift: number;
  retention_score: number;
  classification: ContentClassification;
  updated_at: string;
}

// ── News Moment ─────────────────────────────────────────────

export interface NewsMoment {
  id: string;
  topic: string | null;
  category: string | null;
  article_id: string | null;
  baseline_traffic: number;
  current_traffic: number;
  traffic_lift_percentage: number;
  new_readers: number;
  returning_readers: number;
  high_propensity_readers: number;
  estimated_incremental_revenue: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  detected_at: string;
  expired_at: string | null;
}

// ── System Config ───────────────────────────────────────────

export interface SystemConfig {
  execution_mode: ExecutionMode;
  traffic_rollout: number;
  feature_flags: FeatureFlags;
  decision_thresholds: DecisionThresholds;
  scoring_weights: ScoringWeights;
}

export interface FeatureFlags {
  enable_news_moments: boolean;
  enable_copilot: boolean;
  enable_ltv: boolean;
  enable_churn: boolean;
  enable_shadow_mode: boolean;
}

export interface DecisionThresholds {
  very_high_propensity: number;
  high_propensity: number;
  low_propensity: number;
  high_price_sensitivity: number;
  low_price_sensitivity: number;
  high_churn_risk: number;
}

export interface ScoringWeights {
  engagement_recency: number;
  engagement_frequency: number;
  engagement_depth: number;
  engagement_completion: number;
  engagement_premium: number;
  engagement_consistency: number;
}

// ── Dashboard KPIs ───────────────────────────────────────────

export interface DashboardKPIs {
  reader_revenue: number;
  subscription_conversion: number;
  revenue_per_1000_readers: number;
  high_propensity_audience: number;
  revenue_opportunity: number;
  subscribers_at_risk: number;
  active_readers_30d: number;
  new_subscribers_30d: number;
  churned_subscribers_30d: number;
  total_conversions_30d: number;
  total_revenue_30d: number;
  avg_ltv: number;
}

export interface SubscriptionFunnel {
  unique_readers: number;
  known_readers: number;
  paywall_exposed: number;
  offer_clicks: number;
  checkout_starts: number;
  subscriptions: number;
}

export interface ReaderSegment {
  name: string;
  key: string;
  count: number;
  conversion_rate: number;
  avg_ltv: number;
  estimated_revenue: number;
  recommended_treatment: RevenueAction;
}

// ── Revenue Copilot ─────────────────────────────────────────

export interface CopilotQuestion {
  question: string;
  intent: string;
  parameters: Record<string, unknown>;
}

export interface CopilotAnswer {
  question: string;
  sql: string;
  result: unknown;
  summary?: string;
  sources: string[];
}
