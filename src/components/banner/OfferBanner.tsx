'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  OfferBanner,
  BannerTheme,
  BannerLayout,
  BannerType,
  BannerCTAAction,
} from '@/domain/types';
import { BannerIcon } from './BannerIcons';

// ── Icon Map ─────────────────────────────────────────────────

// (BannerIcon now imported from BannerIcons.tsx)

// ── Theme Token Maps ─────────────────────────────────────────

const THEME_TOKENS: Record<BannerTheme, {
  bg: string; surface: string; text: string; muted: string;
  border: string; btnBg: string; btnText: string; btnHover: string;
  overlay: string;
}> = {
  dark: {
    bg: 'bg-[#0D0D1F]', surface: 'bg-[#0D0D1F]', text: 'text-white',
    muted: 'text-white/50', border: 'border-white/[0.08]',
    btnBg: 'bg-red-600 hover:bg-[#A30F26]', btnText: 'text-white',
    btnHover: 'bg-[#A30F26]',
    overlay: 'rgba(0,0,0,0.85)',
  },
  light: {
    bg: 'bg-white', surface: 'bg-slate-50', text: 'text-slate-900',
    muted: 'text-slate-500', border: 'border-slate-200',
    btnBg: 'bg-red-600 text-white', btnText: 'text-white',
    btnHover: 'bg-red-700',
    overlay: 'rgba(255,255,255,0.95)',
  },
  red: {
    bg: 'bg-red-600', surface: 'bg-red-700', text: 'text-white',
    muted: 'text-red-100', border: 'border-red-500',
    btnBg: 'bg-white text-red-700 hover:bg-red-50', btnText: 'text-red-700',
    btnHover: 'bg-red-50',
    overlay: 'rgba(220,38,38,0.92)',
  },
  emerald: {
    bg: 'bg-emerald-600', surface: 'bg-emerald-700', text: 'text-white',
    muted: 'text-emerald-100', border: 'border-emerald-500',
    btnBg: 'bg-white text-emerald-700 hover:bg-emerald-50', btnText: 'text-emerald-700',
    btnHover: 'bg-emerald-50',
    overlay: 'rgba(5,150,105,0.92)',
  },
};

// ── Dismiss Handler ─────────────────────────────────────────

function useBannerDismiss(bannerId: string, impressionsPerReader: number) {
  const storageKey = `banner_dismissed_${bannerId}`;
  const countKey = `banner_count_${bannerId}`;

  const isDismissed = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const dismissed = sessionStorage.getItem(storageKey);
    if (dismissed) return true;
    const count = parseInt(sessionStorage.getItem(countKey) ?? '0', 10);
    return count >= impressionsPerReader;
  }, [bannerId, impressionsPerReader, storageKey, countKey]);

  const recordImpression = useCallback(() => {
    if (typeof window === 'undefined') return;
    const count = parseInt(sessionStorage.getItem(countKey) ?? '0', 10);
    sessionStorage.setItem(countKey, String(count + 1));
  }, [countKey]);

  const dismiss = useCallback(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(storageKey, '1');
  }, [storageKey]);

  return { isDismissed, recordImpression, dismiss };
}

// ── Event Tracker ───────────────────────────────────────────

async function trackBannerEvent(
  bannerId: string,
  eventType: 'impression' | 'click' | 'dismiss' | 'conversion',
  variant: 'A' | 'B' = 'A',
  extra: Record<string, unknown> = {}
) {
  try {
    await fetch('/api/v1/banners/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banner_id: bannerId, event_type: eventType, variant_shown: variant, ...extra }),
    });
  } catch { /* non-blocking */ }
}

// ── CTA Button ───────────────────────────────────────────────

function CTAButton({
  label,
  action,
  onClick,
  theme,
}: {
  label: string;
  action: BannerCTAAction;
  onClick?: () => void;
  theme: BannerTheme;
}) {
  const tokens = THEME_TOKENS[theme];

  if (action === 'DISMISS') {
    return (
      <button
        onClick={onClick}
        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${tokens.border} ${tokens.text} hover:${tokens.surface}`}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${tokens.btnBg} ${tokens.btnText} shadow-lg hover:shadow-xl active:scale-[0.98]`}
    >
      {label}
    </button>
  );
}

// ── Price Display ────────────────────────────────────────────

function PriceDisplay({
  original,
  discounted,
  period,
  theme,
}: {
  original: number | null;
  discounted: number | null;
  period: string;
  theme: BannerTheme;
}) {
  const tokens = THEME_TOKENS[theme];
  if (!original) return null;

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  return (
    <div className="flex items-baseline gap-2">
      {discounted && original > discounted && (
        <span className={`text-lg font-bold line-through opacity-50 ${tokens.muted}`}>
          {fmt(original)}
        </span>
      )}
      <span className={`text-2xl font-black ${tokens.text}`}>
        {discounted ? fmt(discounted) : fmt(original)}
      </span>
      <span className={`text-sm font-medium ${tokens.muted}`}>{period}</span>
    </div>
  );
}

// ── Slide-In Banner ─────────────────────────────────────────

function SlideInBanner({
  banner,
  variant,
  onDismiss,
  onCTAClick,
}: {
  banner: OfferBanner;
  variant: 'A' | 'B';
  onDismiss: () => void;
  onCTAClick: () => void;
}) {
  const tokens = THEME_TOKENS[banner.theme];
  const headline = variant === 'B' && banner.headline_variant_b ? banner.headline_variant_b : banner.headline;
  const body = variant === 'B' && banner.body_copy_variant_b ? banner.body_copy_variant_b : banner.body_copy;
  const ctaLabel = variant === 'B' && banner.cta_label_variant_b ? banner.cta_label_variant_b : banner.cta_label;
  const accentColor = banner.accent_color;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 ${tokens.bg} ${tokens.border} border-t-2 z-50 shadow-2xl`}
      style={{ borderTopColor: accentColor }}
    >
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
        {banner.icon && (
          <div className="flex-shrink-0" style={{ color: accentColor }}>
            <BannerIcon name={banner.icon} size={28} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {banner.badge_label && (
            <span
              className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 text-white"
              style={{ backgroundColor: banner.badge_color ?? accentColor }}
            >
              {banner.badge_label}
            </span>
          )}
          <p className={`text-sm font-bold ${tokens.text} leading-snug`}>{headline}</p>
          {body && <p className={`text-xs ${tokens.muted} mt-0.5 hidden sm:block`}>{body}</p>}
        </div>
        {banner.show_price && (
          <div className="flex-shrink-0 hidden md:block">
            <PriceDisplay
              original={banner.original_price}
              discounted={banner.discounted_price}
              period={banner.billing_period ?? '/month'}
              theme={banner.theme}
            />
          </div>
        )}
        <div className="flex items-center gap-2 flex-shrink-0">
          <CTAButton
            label={ctaLabel}
            action={banner.cta_action}
            onClick={onCTAClick}
            theme={banner.theme}
          />
          <button onClick={onDismiss} className={`p-2 ${tokens.muted} hover:${tokens.text} transition-colors`} aria-label="Dismiss">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Banner ─────────────────────────────────────────────

function ModalBanner({
  banner,
  variant,
  onDismiss,
  onCTAClick,
}: {
  banner: OfferBanner;
  variant: 'A' | 'B';
  onDismiss: () => void;
  onCTAClick: () => void;
}) {
  const tokens = THEME_TOKENS[banner.theme];
  const headline = variant === 'B' && banner.headline_variant_b ? banner.headline_variant_b : banner.headline;
  const body = variant === 'B' && banner.body_copy_variant_b ? banner.body_copy_variant_b : banner.body_copy;
  const ctaLabel = variant === 'B' && banner.cta_label_variant_b ? banner.cta_label_variant_b : banner.cta_label;
  const accentColor = banner.accent_color;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: tokens.overlay }}
      onClick={(e) => e.target === e.currentTarget && onDismiss()}
    >
      <div
        className={`relative w-full max-w-lg ${tokens.bg} rounded-2xl ${tokens.border} border shadow-2xl overflow-hidden`}
      >
        {/* Top accent bar */}
        <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />

        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              {banner.icon && (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${accentColor}20` }}
                >
                  <div style={{ color: accentColor }}>
                    <BannerIcon name={banner.icon} size={24} />
                  </div>
                </div>
              )}
              <div>
                {banner.badge_label && (
                  <span
                    className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white mb-1"
                    style={{ backgroundColor: banner.badge_color ?? accentColor }}
                  >
                    {banner.badge_label}
                  </span>
                )}
                <h2 className={`text-xl font-black ${tokens.text} leading-tight`}>{headline}</h2>
              </div>
            </div>
            <button onClick={onDismiss} className={`p-2 ${tokens.muted} hover:${tokens.text} transition-colors flex-shrink-0`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Body */}
          {body && (
            <p className={`text-sm ${tokens.muted} leading-relaxed mb-6`}>{body}</p>
          )}

          {/* Price */}
          {banner.show_price && (
            <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: `${accentColor}15` }}>
              <PriceDisplay
                original={banner.original_price}
                discounted={banner.discounted_price}
                period={banner.billing_period ?? '/month'}
                theme={banner.theme}
              />
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <CTAButton
              label={ctaLabel}
              action={banner.cta_action}
              onClick={onCTAClick}
              theme={banner.theme}
            />
            <button
              onClick={onDismiss}
              className={`text-xs ${tokens.muted} hover:${tokens.text} text-center transition-colors py-1`}
            >
              {banner.cta_action === 'DISMISS' ? '' : 'Not now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Inline Banner ────────────────────────────────────────────

function InlineBanner({
  banner,
  variant,
  onCTAClick,
}: {
  banner: OfferBanner;
  variant: 'A' | 'B';
  onCTAClick: () => void;
}) {
  const tokens = THEME_TOKENS[banner.theme];
  const headline = variant === 'B' && banner.headline_variant_b ? banner.headline_variant_b : banner.headline;
  const body = variant === 'B' && banner.body_copy_variant_b ? banner.body_copy_variant_b : banner.body_copy;
  const ctaLabel = variant === 'B' && banner.cta_label_variant_b ? banner.cta_label_variant_b : banner.cta_label;
  const accentColor = banner.accent_color;

  return (
    <div className={`my-4 ${tokens.bg} rounded-xl ${tokens.border} border-l-4 overflow-hidden`} style={{ borderLeftColor: accentColor }}>
      <div className="p-4 flex items-center gap-4">
        {banner.icon && (
          <div className="flex-shrink-0" style={{ color: accentColor }}>
            <BannerIcon name={banner.icon} size={22} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${tokens.text}`}>{headline}</p>
          {body && <p className={`text-xs ${tokens.muted} mt-0.5`}>{body}</p>}
        </div>
        <CTAButton
          label={ctaLabel}
          action={banner.cta_action}
          onClick={onCTAClick}
          theme={banner.theme}
        />
      </div>
    </div>
  );
}

// ── Full Main Component ─────────────────────────────────────

interface OfferBannerProps {
  banner: OfferBanner;
  readerContext?: {
    readerId?: string;
    anonymousId?: string;
    lifecycleStage?: string;
    subscriptionPropensity?: number;
    freeArticlesRead?: number;
    freeArticleLimit?: number;
    platform?: string;
    articleId?: string;
    sessionId?: string;
  };
  /** Override layout — useful for preview mode */
  previewLayout?: BannerLayout;
  /** Force variant — useful for preview */
  forceVariant?: 'A' | 'B';
  onDismiss?: () => void;
  onConversion?: (bannerId: string, action: BannerCTAAction) => void;
}

export default function OfferBannerComponent({
  banner,
  readerContext = {},
  previewLayout,
  forceVariant,
  onDismiss,
  onConversion,
}: OfferBannerProps) {
  const layout = previewLayout ?? banner.layout;
  const [visible, setVisible] = useState(false);
  const [variant, setVariant] = useState<'A' | 'B'>('A');

  const { isDismissed, recordImpression, dismiss: dismissReader } = useBannerDismiss(
    banner.id,
    banner.impressions_per_reader
  );

  const handleDismiss = useCallback(() => {
    dismissReader();
    setVisible(false);
    trackBannerEvent(banner.id, 'dismiss', variant, {
      reader_id: readerContext.readerId,
      session_id: readerContext.sessionId,
      platform: readerContext.platform,
    });
    onDismiss?.();
  }, [banner.id, variant, readerContext, dismissReader, onDismiss]);

  const handleCTAClick = useCallback(() => {
    trackBannerEvent(banner.id, 'click', variant, {
      reader_id: readerContext.readerId,
      session_id: readerContext.sessionId,
      platform: readerContext.platform,
    });

    // Emit conversion event if action leads to subscription
    if (['SUBSCRIBE', 'TRIAL'].includes(banner.cta_action)) {
      trackBannerEvent(banner.id, 'conversion', variant, {
        reader_id: readerContext.readerId,
        session_id: readerContext.sessionId,
        platform: readerContext.platform,
        revenue: banner.discounted_price ?? banner.original_price ?? 0,
      });
    }

    onConversion?.(banner.id, banner.cta_action);
  }, [banner, variant, readerContext, onConversion]);

  useEffect(() => {
    if (banner.is_ab_test && !forceVariant) {
      const roll = Math.random() * 100;
      setVariant(roll < banner.variant_allocation_percentage ? 'B' : 'A');
    } else {
      setVariant(forceVariant ?? 'A');
    }
  }, [banner.is_ab_test, banner.variant_allocation_percentage, forceVariant]);

  useEffect(() => {
    if (!banner.is_active) return;
    if (isDismissed()) return;

    // Schedule check
    const now = new Date();
    if (banner.starts_at && now < new Date(banner.starts_at)) return;
    if (banner.ends_at && now > new Date(banner.ends_at)) return;

    // Impressions cap check
    if (banner.impression_cap) {
      const impKey = `banner_imp_${banner.id}`;
      const count = parseInt(sessionStorage.getItem(impKey) ?? '0', 10);
      if (count >= banner.impression_cap) return;
      sessionStorage.setItem(impKey, String(count + 1));
    }

    setVisible(true);
    recordImpression();
    trackBannerEvent(banner.id, 'impression', variant, {
      reader_id: readerContext.readerId,
      anonymous_id: readerContext.anonymousId,
      session_id: readerContext.sessionId,
      platform: readerContext.platform,
      lifecycle_stage: readerContext.lifecycleStage,
      subscription_propensity: readerContext.subscriptionPropensity,
    });
  }, [banner, isDismissed, recordImpression, variant, readerContext]);

  if (!visible) return null;

  const commonProps = { banner, variant, onDismiss: handleDismiss, onCTAClick: handleCTAClick };

  switch (layout) {
    case 'slide_in':
      return <SlideInBanner {...commonProps} />;
    case 'modal':
      return <ModalBanner {...commonProps} />;
    case 'inline':
      return <InlineBanner banner={banner} variant={variant} onCTAClick={handleCTAClick} />;
    case 'banner':
      return <InlineBanner banner={banner} variant={variant} onCTAClick={handleCTAClick} />;
    case 'interstitial':
      return <ModalBanner {...commonProps} />;
    default:
      return <SlideInBanner {...commonProps} />;
  }
}
