-- ============================================================
-- Migration: 002_subscription_attribution
-- Adds subscription attribution, content context, metering,
-- and lifecycle tracking fields to support subscription-first
-- Revenue Brain decisions
-- ============================================================

-- 1. Conversions: attribution to specific article + session
ALTER TABLE conversions
  ADD COLUMN IF NOT EXISTS article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attribution_source VARCHAR(50) DEFAULT 'paywall',
  ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);

COMMENT ON COLUMN conversions.article_id IS 'Article the reader was viewing when they subscribed — for content attribution';
COMMENT ON COLUMN conversions.attribution_source IS 'paywall | newsletter | referral | direct — how the reader arrived at conversion';
COMMENT ON COLUMN conversions.session_id IS 'Browser session ID at time of conversion for session-level attribution';

-- 2. Events: denormalized article context for content analytics
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS article_category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS article_topic VARCHAR(100),
  ADD COLUMN IF NOT EXISTS content_type VARCHAR(50);

COMMENT ON COLUMN events.article_category IS 'Denormalized from articles.category at event ingestion time';
COMMENT ON COLUMN events.article_topic IS 'Denormalized from articles.topic at event ingestion time';
COMMENT ON COLUMN events.content_type IS 'Content classification (Investigation, Opinion, News, etc.)';

-- 3. Reader Features: metering + lifecycle tracking
ALTER TABLE reader_features
  ADD COLUMN IF NOT EXISTS free_articles_read INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paywall_meter_reset_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(20) DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS lifecycle_stage_changed_at TIMESTAMPTZ;

COMMENT ON COLUMN reader_features.free_articles_read IS 'Number of premium articles read before paywall triggers — resets monthly';
COMMENT ON COLUMN reader_features.paywall_meter_reset_at IS 'When the free article meter resets (30 days from first premium article view)';
COMMENT ON COLUMN reader_features.lifecycle_stage IS 'NEW | CASUAL | ENGAGED | HIGH_INTENT | CONVERTING | SUBSCRIBED | AT_RISK | LAPSED | WINBACK';
COMMENT ON COLUMN reader_features.lifecycle_stage_changed_at IS 'Timestamp when lifecycle stage last changed';

-- 4. Indexes for new query patterns
CREATE INDEX IF NOT EXISTS idx_events_article_category ON events(article_category) WHERE article_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_article_topic ON events(article_topic) WHERE article_topic IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reader_features_lifecycle ON reader_features(lifecycle_stage) WHERE lifecycle_stage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversions_article_id ON conversions(article_id) WHERE article_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversions_attribution_source ON conversions(attribution_source) WHERE attribution_source IS NOT NULL;
