-- ============================================================
-- Migration: 003_offer_banners
-- Full offer banner management system for Tempo+ subscription
-- ============================================================

-- ── Banner Templates ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS offer_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,

  -- Banner type
  banner_type VARCHAR(50) NOT NULL,
  -- SOFT_PAYWALL | HARD_PAYWALL | PROMO_OFFER | WINBACK | SAVE_OFFER
  -- NEWSLETTER_GATE | TRIAL | ANNUAL_PROMO | REGISTRATION_GATE | DAY_PASS

  -- Copy
  headline VARCHAR(255) NOT NULL,
  headline_variant_b VARCHAR(255),
  body_copy TEXT,
  body_copy_variant_b TEXT,

  -- CTA
  cta_label VARCHAR(100) DEFAULT 'Langganan Sekarang',
  cta_label_variant_b VARCHAR(100),
  cta_action VARCHAR(50) DEFAULT 'SUBSCRIBE',
  -- SUBSCRIBE | TRIAL | REGISTER | NEWSLETTER | DISMISS | EXTERNAL

  -- Visual style
  layout VARCHAR(30) DEFAULT 'modal',
  -- modal | slide_in | inline | banner | interstitial
  theme VARCHAR(20) DEFAULT 'dark',
  -- dark | light | red | emerald
  icon VARCHAR(50),
  -- crown | lock | sparkles | heart | percent | mail | star | gift | fire
  accent_color VARCHAR(7) DEFAULT '#DC2626',
  background_color VARCHAR(7),
  text_color VARCHAR(7),

  -- Badge / label
  badge_label VARCHAR(50),
  badge_color VARCHAR(7) DEFAULT '#DC2626',

  -- Pricing display
  show_price BOOLEAN DEFAULT TRUE,
  original_price BIGINT,
  discounted_price BIGINT,
  billing_period VARCHAR(30) DEFAULT '/bulan',

  -- Targeting
  target_lifecycle VARCHAR(50)[] DEFAULT '{}',
  -- NEW | CASUAL | ENGAGED | HIGH_INTENT | CONVERTING | SUBSCRIBED | AT_RISK | LAPSED | WINBACK
  -- Empty array = all stages
  target_min_propensity INTEGER,
  target_max_propensity INTEGER,
  target_platform VARCHAR(20)[],
  -- web | ios | android | all — empty = all platforms

  -- A/B testing
  is_ab_test BOOLEAN DEFAULT FALSE,
  variant_allocation_percentage INTEGER DEFAULT 50,
  -- % of traffic that sees variant B

  -- Schedule
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 50,
  -- Higher = shows first when multiple banners match
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,

  -- Frequency cap
  impression_cap INTEGER,
  -- Max impressions total (NULL = unlimited)
  impressions_per_reader INTEGER DEFAULT 3,
  -- Max impressions per reader before suppressing

  -- Attribution
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  experiment_id UUID REFERENCES experiments(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255)
);

-- ── Banner Impressions ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS banner_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id UUID NOT NULL REFERENCES offer_banners(id) ON DELETE CASCADE,
  reader_id UUID REFERENCES readers(id) ON DELETE SET NULL,
  anonymous_id VARCHAR(255),
  variant_shown VARCHAR(5) DEFAULT 'A',
  -- A or B

  -- Event
  event_type VARCHAR(30) NOT NULL,
  -- impression | click | dismiss | conversion

  -- Context
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  platform VARCHAR(20) DEFAULT 'web',
  lifecycle_stage VARCHAR(20),
  subscription_propensity INTEGER,

  -- Revenue (for conversion events)
  revenue BIGINT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Banner Analytics Summary (materialized / refreshable) ─────

CREATE TABLE IF NOT EXISTS banner_stats (
  banner_id UUID PRIMARY KEY REFERENCES offer_banners(id) ON DELETE CASCADE,
  total_impressions BIGINT DEFAULT 0,
  unique_readers BIGINT DEFAULT 0,
  total_clicks BIGINT DEFAULT 0,
  total_dismisses BIGINT DEFAULT 0,
  total_conversions BIGINT DEFAULT 0,
  total_revenue BIGINT DEFAULT 0,
  variant_a_impressions BIGINT DEFAULT 0,
  variant_b_impressions BIGINT DEFAULT 0,
  variant_a_clicks BIGINT DEFAULT 0,
  variant_b_clicks BIGINT DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_banners_active ON offer_banners(is_active, priority DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_banners_type ON offer_banners(banner_type);
CREATE INDEX IF NOT EXISTS idx_banners_schedule ON offer_banners(starts_at, ends_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_impressions_banner ON banner_impressions(banner_id);
CREATE INDEX IF NOT EXISTS idx_impressions_reader ON banner_impressions(reader_id);
CREATE INDEX IF NOT EXISTS idx_impressions_event ON banner_impressions(event_type);
CREATE INDEX IF NOT EXISTS idx_impressions_created ON banner_impressions(created_at);

-- ── Trigger: update updated_at ────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_banners_updated_at
  BEFORE UPDATE ON offer_banners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Trigger: increment banner_stats on impression ─────────────

CREATE OR REPLACE FUNCTION record_banner_impression()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO banner_stats (banner_id, total_impressions, unique_readers, total_clicks, total_dismisses, total_conversions, total_revenue, variant_a_impressions, variant_b_impressions, last_updated)
  VALUES (
    NEW.banner_id,
    CASE WHEN NEW.event_type = 'impression' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'impression' AND NEW.reader_id IS NOT NULL THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'click' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'dismiss' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'conversion' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'conversion' THEN COALESCE(NEW.revenue, 0) ELSE 0 END,
    CASE WHEN NEW.event_type = 'impression' AND NEW.variant_shown = 'A' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'impression' AND NEW.variant_shown = 'B' THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (banner_id) DO UPDATE SET
    total_impressions = banner_stats.total_impressions + CASE WHEN NEW.event_type = 'impression' THEN 1 ELSE 0 END,
    unique_readers = banner_stats.unique_readers + CASE WHEN NEW.event_type = 'impression' AND NEW.reader_id IS NOT NULL THEN 1 ELSE 0 END,
    total_clicks = banner_stats.total_clicks + CASE WHEN NEW.event_type = 'click' THEN 1 ELSE 0 END,
    total_dismisses = banner_stats.total_dismisses + CASE WHEN NEW.event_type = 'dismiss' THEN 1 ELSE 0 END,
    total_conversions = banner_stats.total_conversions + CASE WHEN NEW.event_type = 'conversion' THEN 1 ELSE 0 END,
    total_revenue = banner_stats.total_revenue + CASE WHEN NEW.event_type = 'conversion' THEN GREATEST(COALESCE(NEW.revenue, 0), 0) ELSE 0 END,
    variant_a_impressions = banner_stats.variant_a_impressions + CASE WHEN NEW.event_type = 'impression' AND NEW.variant_shown = 'A' THEN 1 ELSE 0 END,
    variant_b_impressions = banner_stats.variant_b_impressions + CASE WHEN NEW.event_type = 'impression' AND NEW.variant_shown = 'B' THEN 1 ELSE 0 END,
    last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_banner_impression
  AFTER INSERT ON banner_impressions
  FOR EACH ROW EXECUTE FUNCTION record_banner_impression();

-- ── Seed default banners ──────────────────────────────────────

INSERT INTO offer_banners (name, slug, banner_type, headline, body_copy, cta_label, cta_action, layout, theme, icon, priority) VALUES
(
  'Soft Paywall — Default',
  'soft-paywall-default',
  'SOFT_PAYWALL',
  'Anda sudah membaca {{free_articles_read}} dari {{free_limit}} artikel gratis',
  'Subscribe Tempo+ untuk akses tak terbatas ke seluruh investigative report dan analisis mendalam.',
  'Langganan Tempo+',
  'SUBSCRIBE',
  'slide_in',
  'dark',
  'lock',
  80
),
(
  'Hard Paywall — Meter Habis',
  'hard-paywall-meter-habis',
  'HARD_PAYWALL',
  'Artikel ini eksklusif untuk subscriber Tempo+',
  'Subscribe sekarang untuk akses penuh ke seluruh investigative journalism dan konten premium Tempo+.',
  'Langganan Sekarang',
  'SUBSCRIBE',
  'modal',
  'dark',
  'lock',
  90
),
(
  'Tempo+ Monthly Offer',
  'monthly-subscription',
  'PROMO_OFFER',
  'Tempo+ Monthly — Akses Tak Terbatas',
  'Rp 64.000/bulan untuk seluruh investigative report, analisis, dan konten premium tanpa batas.',
  'Langganan Rp 64.000/bulan',
  'SUBSCRIBE',
  'modal',
  'red',
  'crown',
  70
),
(
  'Trial 7 Hari Gratis',
  'trial-7-days',
  'TRIAL',
  'Coba Tempo+ Gratis 7 Hari',
  'Tidak perlu kartu kredit. Rasakan sendiri investigative journalism yang bikin beda.',
  'Mulai Gratis 7 Hari',
  'TRIAL',
  'modal',
  'emerald',
  'sparkles',
  65
),
(
  'Save Offer — Diskon 30%',
  'save-offer-30',
  'SAVE_OFFER',
  'Tunggu! Harga Khusus untuk Anda',
  'Diskon 30% bulan pertama — hanya Rp 44.800. Jangan sampai kehilangan akses ke konten yang sudah Anda andalkan.',
  'Ambil Diskon Ini',
  'SUBSCRIBE',
  'modal',
  'red',
  'percent',
  95
),
(
  'Winback — Mantan Pelanggan',
  'winback-former-subscriber',
  'WINBACK',
  'Kami Rindu Anda Kembali',
  'Kembali ke Tempo+ dengan harga khusus mantan pelanggan — akses penuh investigative journalism untuk Rp 49.000/bulan.',
  'Kembali ke Tempo+',
  'SUBSCRIBE',
  'modal',
  'dark',
  'heart',
  85
),
(
  'Annual Promo — Hemat 2 Bulan',
  'annual-promo',
  'ANNUAL_PROMO',
  'Paket Annual — Pilihan Terbaik untuk Pembaca Setia',
  'Hemat 2 bulan. Akses tak terbatas ke seluruh arsip dan konten baru setiap hari.',
  'Langganan Annual Sekarang',
  'SUBSCRIBE',
  'modal',
  'emerald',
  'gift',
  75
),
(
  'Newsletter Gate',
  'newsletter-gate',
  'NEWSLETTER_GATE',
  'Dapatkan Update Investigative Report Setiap Pagi',
  'Daftar newsletter Tempo — gratis, tanpa spam, investigative journalism langsung ke inbox Anda.',
  'Daftar Newsletter Gratis',
  'NEWSLETTER',
  'inline',
  'light',
  'mail',
  40
),
(
  'Registration Wall',
  'registration-wall',
  'REGISTRATION_GATE',
  'Buat Akun Gratis untuk Pengalaman Terbaik',
  'Daftar gratis untuk simpan artikel, dapat rekomendasi personal, dan penawaran eksklusif.',
  'Daftar Gratis',
  'REGISTER',
  'inline',
  'light',
  'star',
  30
)
ON CONFLICT (slug) DO NOTHING;
