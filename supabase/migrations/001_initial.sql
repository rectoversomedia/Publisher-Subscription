-- ============================================================
-- Tempo Reader Revenue Brain — Initial Migration
-- Powered by Rectoverso
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE identity_status AS ENUM ('ANONYMOUS', 'REGISTERED', 'KNOWN');
CREATE TYPE subscription_status AS ENUM ('NONE', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'TRIAL', 'PAUSED');
CREATE TYPE experiment_status AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'ARCHIVED');
CREATE TYPE opportunity_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE opportunity_status AS ENUM ('DETECTED', 'INVESTIGATING', 'ACTION_TAKEN', 'RESOLVED', 'DISMISSED');

-- ============================================================
-- READERS
-- ============================================================

CREATE TABLE readers (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_user_id            VARCHAR(255) UNIQUE,
  anonymous_id               VARCHAR(255) UNIQUE,
  email_hash                 VARCHAR(255),
  identity_status            identity_status DEFAULT 'ANONYMOUS',
  subscription_status        subscription_status DEFAULT 'NONE',
  current_plan_id            VARCHAR(255),
  subscription_started_at    TIMESTAMPTZ,
  subscription_expires_at    TIMESTAMPTZ,
  first_seen_at              TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at               TIMESTAMPTZ DEFAULT NOW(),
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_readers_subscription_status ON readers(subscription_status);
CREATE INDEX idx_readers_identity_status ON readers(identity_status);
CREATE INDEX idx_readers_last_seen_at ON readers(last_seen_at DESC);

-- ============================================================
-- READER FEATURES
-- ============================================================

CREATE TABLE reader_features (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reader_id                   UUID UNIQUE NOT NULL REFERENCES readers(id) ON DELETE CASCADE,

  -- Behavioral metrics
  sessions_7d                 INTEGER DEFAULT 0,
  sessions_30d                INTEGER DEFAULT 0,
  articles_7d                 INTEGER DEFAULT 0,
  articles_30d                INTEGER DEFAULT 0,
  premium_articles_30d        INTEGER DEFAULT 0,
  avg_scroll_depth            FLOAT DEFAULT 0,
  avg_completion_rate         FLOAT DEFAULT 0,
  paywall_views_30d           INTEGER DEFAULT 0,
  offer_clicks_30d           INTEGER DEFAULT 0,
  checkout_starts_30d         INTEGER DEFAULT 0,
  days_since_last_visit       INTEGER DEFAULT 0,
  newsletter_signups           INTEGER DEFAULT 0,
  registrations               INTEGER DEFAULT 0,
  former_subscriber           BOOLEAN DEFAULT FALSE,
  is_suspected_bot           BOOLEAN DEFAULT FALSE,

  -- Calculated scores
  engagement_score            INTEGER DEFAULT 0,
  subscription_propensity     INTEGER DEFAULT 0,
  price_sensitivity           INTEGER DEFAULT 50,
  content_loyalty             INTEGER DEFAULT 0,
  churn_risk                  INTEGER DEFAULT 0,
  predicted_ltv               FLOAT DEFAULT 0,

  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reader_features_propensity ON reader_features(subscription_propensity DESC);
CREATE INDEX idx_reader_features_churn ON reader_features(churn_risk DESC);
CREATE INDEX idx_reader_features_engagement ON reader_features(engagement_score DESC);

-- ============================================================
-- READER TOPIC AFFINITY
-- ============================================================

CREATE TABLE reader_topic_affinity (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reader_id           UUID NOT NULL REFERENCES readers(id) ON DELETE CASCADE,
  topic               VARCHAR(100) NOT NULL,
  score               FLOAT DEFAULT 0,
  article_count       INTEGER DEFAULT 0,
  last_engaged_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reader_id, topic)
);

CREATE INDEX idx_topic_affinity_reader ON reader_topic_affinity(reader_id);
CREATE INDEX idx_topic_affinity_topic ON reader_topic_affinity(topic);

-- ============================================================
-- ARTICLES
-- ============================================================

CREATE TABLE articles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_article_id   VARCHAR(255) UNIQUE,
  title                 TEXT NOT NULL,
  slug                  VARCHAR(500) UNIQUE NOT NULL,
  category              VARCHAR(100) NOT NULL,
  topic                 VARCHAR(100) NOT NULL,
  author                VARCHAR(255) NOT NULL,
  is_premium            BOOLEAN DEFAULT TRUE,
  published_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_topic ON articles(topic);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);

-- ============================================================
-- EVENTS
-- ============================================================

CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id       VARCHAR(255) UNIQUE NOT NULL,
  reader_id      UUID REFERENCES readers(id) ON DELETE SET NULL,
  anonymous_id   VARCHAR(255),
  session_id     VARCHAR(255) NOT NULL,
  event_name     VARCHAR(100) NOT NULL,
  article_id     UUID REFERENCES articles(id) ON DELETE SET NULL,
  timestamp      TIMESTAMPTZ DEFAULT NOW(),
  source         VARCHAR(50) DEFAULT 'web',
  metadata       JSONB DEFAULT '{}'
);

CREATE INDEX idx_events_reader_id ON events(reader_id);
CREATE INDEX idx_events_anonymous_id ON events(anonymous_id);
CREATE INDEX idx_events_session_id ON events(session_id);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX idx_events_event_name ON events(event_name);
CREATE INDEX idx_events_article_id ON events(article_id);

-- ============================================================
-- OFFERS
-- ============================================================

CREATE TABLE offers (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  VARCHAR(255) NOT NULL,
  plan_type             VARCHAR(50) NOT NULL,
  price                 INTEGER NOT NULL,
  original_price        INTEGER,
  billing_period        VARCHAR(50) NOT NULL,
  offer_type            VARCHAR(50) NOT NULL,
  discount_percentage   INTEGER DEFAULT 0,
  active                BOOLEAN DEFAULT TRUE,
  description           TEXT,
  features              JSONB DEFAULT '[]',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offers_active ON offers(active);
CREATE INDEX idx_offers_plan_type ON offers(plan_type);

-- ============================================================
-- DECISIONS
-- ============================================================

CREATE TABLE decisions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reader_id             UUID NOT NULL REFERENCES readers(id) ON DELETE CASCADE,
  timestamp             TIMESTAMPTZ DEFAULT NOW(),
  context               JSONB DEFAULT '{}',
  selected_action       VARCHAR(100) NOT NULL,
  selected_offer_id     UUID REFERENCES offers(id),
  score_snapshot        JSONB DEFAULT '{}',
  reason_codes          JSONB DEFAULT '[]',
  decision_version      VARCHAR(50) DEFAULT 'rules-v1',
  experiment_id         UUID,
  treatment_id          UUID,
  confidence            FLOAT,
  execution_mode        VARCHAR(50) DEFAULT 'LIVE',
  existing_treatment    VARCHAR(100),
  expected_value        FLOAT,
  latency_ms            INTEGER,
  is_shadow             BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_decisions_reader_id ON decisions(reader_id);
CREATE INDEX idx_decisions_timestamp ON decisions(timestamp DESC);
CREATE INDEX idx_decisions_selected_action ON decisions(selected_action);
CREATE INDEX idx_decisions_experiment_id ON decisions(experiment_id);

-- ============================================================
-- EXPERIMENTS
-- ============================================================

CREATE TABLE experiments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  VARCHAR(255) NOT NULL,
  hypothesis            TEXT,
  description           TEXT,
  status                experiment_status DEFAULT 'DRAFT',
  primary_metric        VARCHAR(100) NOT NULL,
  guardrail_metrics     JSONB DEFAULT '[]',
  start_at              TIMESTAMPTZ,
  end_at                TIMESTAMPTZ,
  audience_definition   JSONB DEFAULT '{}',
  traffic_percentage    INTEGER DEFAULT 100,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_experiments_created_at ON experiments(created_at DESC);

-- ============================================================
-- EXPERIMENT VARIANTS
-- ============================================================

CREATE TABLE experiment_variants (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id         UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  name                  VARCHAR(255) NOT NULL,
  allocation_percentage INTEGER DEFAULT 0,
  action                VARCHAR(100),
  offer_id              UUID REFERENCES offers(id),
  configuration         JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exp_variants_experiment_id ON experiment_variants(experiment_id);

-- ============================================================
-- EXPERIMENT ASSIGNMENTS
-- ============================================================

CREATE TABLE experiment_assignments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id   UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_id      UUID NOT NULL REFERENCES experiment_variants(id),
  reader_id       UUID NOT NULL REFERENCES readers(id) ON DELETE CASCADE,
  assigned_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(experiment_id, reader_id)
);

CREATE INDEX idx_exp_assignments_reader_id ON experiment_assignments(reader_id);
CREATE INDEX idx_exp_assignments_experiment_id ON experiment_assignments(experiment_id);

-- ============================================================
-- CONVERSIONS
-- ============================================================

CREATE TABLE conversions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reader_id         UUID NOT NULL REFERENCES readers(id) ON DELETE CASCADE,
  decision_id       UUID,
  experiment_id     UUID,
  variant_id        UUID,
  offer_id          UUID REFERENCES offers(id),
  conversion_type   VARCHAR(100) NOT NULL,
  revenue           INTEGER DEFAULT 0,
  occurred_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversions_reader_id ON conversions(reader_id);
CREATE INDEX idx_conversions_occurred_at ON conversions(occurred_at DESC);
CREATE INDEX idx_conversions_type ON conversions(conversion_type);

-- ============================================================
-- OPPORTUNITIES
-- ============================================================

CREATE TABLE opportunities (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type                      VARCHAR(100) NOT NULL,
  title                     VARCHAR(500) NOT NULL,
  description               TEXT,
  severity                  opportunity_severity DEFAULT 'MEDIUM',
  status                    opportunity_status DEFAULT 'DETECTED',
  estimated_audience        INTEGER DEFAULT 0,
  estimated_incremental_revenue INTEGER DEFAULT 0,
  recommended_action        VARCHAR(255),
  supporting_metrics         JSONB DEFAULT '{}',
  detected_at               TIMESTAMPTZ DEFAULT NOW(),
  resolved_at               TIMESTAMPTZ
);

CREATE INDEX idx_opportunities_type ON opportunities(type);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_severity ON opportunities(severity);
CREATE INDEX idx_opportunities_detected_at ON opportunities(detected_at DESC);

-- ============================================================
-- CONTENT METRICS
-- ============================================================

CREATE TABLE content_metrics (
  id                            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id                    UUID UNIQUE NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  pageviews                     INTEGER DEFAULT 0,
  unique_readers                INTEGER DEFAULT 0,
  registered_readers            INTEGER DEFAULT 0,
  subscriber_readers            INTEGER DEFAULT 0,
  paywall_exposures             INTEGER DEFAULT 0,
  offer_clicks                  INTEGER DEFAULT 0,
  direct_subscriptions          INTEGER DEFAULT 0,
  assisted_subscriptions        INTEGER DEFAULT 0,
  revenue                       INTEGER DEFAULT 0,
  estimated_ltv_generated       FLOAT DEFAULT 0,
  subscription_propensity_lift  FLOAT DEFAULT 0,
  retention_score               FLOAT DEFAULT 0,
  classification                VARCHAR(50) DEFAULT 'TRAFFIC_CONTENT',
  updated_at                    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NEWS MOMENTS
-- ============================================================

CREATE TABLE news_moments (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic                       VARCHAR(100),
  category                    VARCHAR(100),
  article_id                  UUID,
  baseline_traffic            INTEGER DEFAULT 0,
  current_traffic             INTEGER DEFAULT 0,
  traffic_lift_percentage     FLOAT DEFAULT 0,
  new_readers                 INTEGER DEFAULT 0,
  returning_readers           INTEGER DEFAULT 0,
  high_propensity_readers     INTEGER DEFAULT 0,
  estimated_incremental_revenue INTEGER DEFAULT 0,
  severity                    opportunity_severity DEFAULT 'MEDIUM',
  status                      VARCHAR(50) DEFAULT 'ACTIVE',
  detected_at                 TIMESTAMPTZ DEFAULT NOW(),
  expired_at                  TIMESTAMPTZ
);

CREATE INDEX idx_news_moments_topic ON news_moments(topic);
CREATE INDEX idx_news_moments_category ON news_moments(category);
CREATE INDEX idx_news_moments_detected_at ON news_moments(detected_at DESC);
CREATE INDEX idx_news_moments_status ON news_moments(status);

-- ============================================================
-- SYSTEM CONFIG
-- ============================================================

CREATE TABLE system_config (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         VARCHAR(255) UNIQUE NOT NULL,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  VARCHAR(255)
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor       VARCHAR(100) NOT NULL,
  action      VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id   VARCHAR(255),
  metadata    JSONB DEFAULT '{}',
  ip_address  VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);

-- ============================================================
-- TRIGGER: updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER readers_updated_at BEFORE UPDATE ON readers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER offers_updated_at BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER experiments_updated_at BEFORE UPDATE ON experiments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER reader_features_updated_at BEFORE UPDATE ON reader_features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER content_metrics_updated_at BEFORE UPDATE ON content_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER system_config_updated_at BEFORE UPDATE ON system_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- DEFAULT CONFIG
-- ============================================================

INSERT INTO system_config (key, value) VALUES
  ('execution_mode', '"LIVE"'),
  ('traffic_rollout', '100'),
  ('feature_flags', '{"enable_news_moments": true, "enable_copilot": true, "enable_ltv": true, "enable_churn": true, "enable_shadow_mode": true}'),
  ('decision_thresholds', '{"very_high_propensity": 80, "high_propensity": 60, "low_propensity": 30, "high_price_sensitivity": 65, "low_price_sensitivity": 40, "high_churn_risk": 75}'),
  ('scoring_weights', '{"engagement_recency": 20, "engagement_frequency": 20, "engagement_depth": 20, "engagement_completion": 15, "engagement_premium": 15, "engagement_consistency": 10}');
