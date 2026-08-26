-- Migration: 004_seed_example_banners
-- 5 English example banners to replace the initial seed data
-- Run this AFTER migration 003_offer_banners has been applied

-- Delete old seed banners by slug
DELETE FROM offer_banners WHERE slug IN (
  'soft-paywall-default',
  'hard-paywall-meter-habis',
  'monthly-subscription',
  'trial-7-days',
  'save-offer-30',
  'winback-former-subscriber',
  'annual-promo',
  'newsletter-gate',
  'registration-wall',
  'soft-paywall-meter',
  'monthly-promo-30-off',
  'trial-7-days-free',
  'winback-we-miss-you',
  'annual-best-value'
);

-- Insert 5 English example banners
INSERT INTO offer_banners
  (name, slug, banner_type, headline, body_copy, cta_label, cta_action,
   layout, theme, icon, priority, original_price, discounted_price,
   billing_period, badge_label, badge_color, show_price, is_active,
   is_ab_test, variant_allocation_percentage, impressions_per_reader, target_lifecycle)
VALUES

-- 1. Soft Paywall — free article meter
(
  'Soft Paywall — Free Article Meter',
  'soft-paywall-meter',
  'SOFT_PAYWALL',
  'You''ve read {{free_articles_read}} of 3 free articles',
  'Subscribe to Tempo+ for unlimited access to all investigative reports and exclusive journalism.',
  'Subscribe Now',
  'SUBSCRIBE',
  'slide_in',
  'dark',
  'lock',
  80,
  64000,
  NULL,
  '/month',
  'LIMITED ACCESS',
  '#DC2626',
  true,
  true,
  true,
  50,
  3,
  ARRAY['NEW','CASUAL','ENGAGED']::VARCHAR[]
),

-- 2. Monthly Promo — 30% off urgency
(
  'Monthly Promo — 30% Off Special',
  'monthly-promo-30-off',
  'PROMO_OFFER',
  'Special Offer: 30% Off Your First 3 Months',
  'Get full access to all Tempo+ articles, investigations, and exclusive content for just Rp 44,800/month.',
  'Claim This Offer',
  'SUBSCRIBE',
  'modal',
  'red',
  'percent',
  95,
  64000,
  44800,
  '/month',
  '30% OFF',
  '#DC2626',
  true,
  true,
  true,
  50,
  3,
  ARRAY['ENGAGED','HIGH_INTENT','CONVERTING']::VARCHAR[]
),

-- 3. Trial — 7 days free, no credit card
(
  '7-Day Free Trial',
  'trial-7-days-free',
  'TRIAL',
  'Try Tempo+ Free for 7 Days — No Credit Card Required',
  'Explore thousands of investigative reports and in-depth journalism. Cancel anytime.',
  'Start Free Trial',
  'TRIAL',
  'modal',
  'emerald',
  'sparkles',
  65,
  64000,
  NULL,
  '/month',
  'FREE TRIAL',
  '#059669',
  true,
  false,
  NULL,
  3,
  ARRAY['NEW','CASUAL','ENGAGED']::VARCHAR[]
),

-- 4. Winback — lapsed subscriber
(
  'Winback — We Miss You',
  'winback-we-miss-you',
  'WINBACK',
  'We''ve Been Waiting for You to Come Back',
  'Welcome back offer: Rp 49,000/month for all your favorite Tempo+ content. Reactivate today.',
  'Welcome Back',
  'SUBSCRIBE',
  'modal',
  'dark',
  'heart',
  85,
  64000,
  49000,
  '/month',
  'WELCOME BACK',
  '#0F172A',
  true,
  true,
  true,
  40,
  5,
  ARRAY['LAPSED','WINBACK']::VARCHAR[]
),

-- 5. Annual — best value
(
  'Annual Plan — Best Value',
  'annual-best-value',
  'ANNUAL_PROMO',
  'Unlock the Full Tempo+ Experience — 2 Months Free',
  'Subscribe annually and save Rp 1.28 juta. Full access to every article, archive, and exclusive investigation.',
  'Subscribe Annually',
  'SUBSCRIBE',
  'modal',
  'emerald',
  'gift',
  75,
  768000,
  640000,
  '/year',
  'BEST VALUE',
  '#059669',
  true,
  false,
  NULL,
  5,
  ARRAY['HIGH_INTENT','CONVERTING','ENGAGED']::VARCHAR[]
);
