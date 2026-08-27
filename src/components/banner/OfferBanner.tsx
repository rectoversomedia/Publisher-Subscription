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
  overlay: string; dismissHover: string;
}> = {
  dark: {
    bg: 'bg-[#0D0D1F]', surface: 'bg-white/[0.07]', text: 'text-white',
    muted: 'text-white/50', border: 'border-white/[0.08]',
    btnBg: 'bg-red-600', btnText: 'text-white', btnHover: 'hover:bg-red-700',
    overlay: 'rgba(0,0,0,0.85)',
    dismissHover: 'hover:bg-white/[0.07]',
  },
  light: {
    bg: 'bg-white', surface: 'bg-slate-100', text: 'text-slate-900',
    muted: 'text-slate-500', border: 'border-slate-200',
    btnBg: 'bg-red-600', btnText: 'text-white', btnHover: 'hover:bg-red-700',
    overlay: 'rgba(255,255,255,0.95)',
    dismissHover: 'hover:bg-slate-100',
  },
  red: {
    bg: 'bg-red-600', surface: 'bg-red-700', text: 'text-white',
    muted: 'text-red-100', border: 'border-red-500',
    btnBg: 'bg-white', btnText: 'text-red-700', btnHover: 'hover:bg-red-50',
    overlay: 'rgba(220,38,38,0.92)',
    dismissHover: 'hover:bg-red-700',
  },
  emerald: {
    bg: 'bg-emerald-600', surface: 'bg-emerald-700', text: 'text-white',
    muted: 'text-emerald-100', border: 'border-emerald-500',
    btnBg: 'bg-white', btnText: 'text-emerald-700', btnHover: 'hover:bg-emerald-50',
    overlay: 'rgba(5,150,105,0.92)',
    dismissHover: 'hover:bg-emerald-700',
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
        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${tokens.border} ${tokens.text} ${tokens.dismissHover}`}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${tokens.btnBg} ${tokens.btnText} shadow-lg hover:shadow-xl active:scale-[0.98] ${tokens.btnHover}`}
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
      className={`fixed bottom-0 left-0 right-0 z-50 shadow-2xl ${tokens.bg}`}
      style={{ borderTop: `3px solid ${accentColor}` }}
    >
      {/* Subtle top gradient */}
      <div
        className="h-1 w-full opacity-80"
        style={{ background: `linear-gradient(to right, ${accentColor}, ${accentColor}80, transparent)` }}
      />
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
        {/* Icon */}
        {banner.icon && (
          <div
            className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}18` }}
          >
            <div style={{ color: accentColor }}>
              <BannerIcon name={banner.icon} size={22} />
            </div>
          </div>
        )}
        {/* Content */}
        <div className="flex-1 min-w-0">
          {banner.badge_label && (
            <span
              className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 text-white"
              style={{ backgroundColor: banner.badge_color ?? accentColor }}
            >
              {banner.badge_label}
            </span>
          )}
          <p className={`text-sm font-bold ${tokens.text} leading-snug`}>{headline}</p>
          {body && <p className={`text-xs ${tokens.muted} mt-0.5 hidden sm:block`}>{body}</p>}
        </div>
        {/* Price */}
        {banner.show_price && (
          <div className="flex-shrink-0 hidden md:block text-right">
            {banner.discounted_price ? (
              <div className="flex items-baseline gap-1.5">
                <span className={`text-lg font-black ${tokens.text}`}>
                  Rp {(banner.discounted_price ?? 0).toLocaleString('id-ID')}
                </span>
                {banner.original_price && banner.original_price > (banner.discounted_price ?? 0) && (
                  <span className={`text-xs line-through ${tokens.muted}`}>
                    Rp {(banner.original_price ?? 0).toLocaleString('id-ID')}
                  </span>
                )}
                <span className={`text-[10px] ${tokens.muted}`}>{banner.billing_period ?? '/bulan'}</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className={`text-lg font-black ${tokens.text}`}>
                  Rp {(banner.original_price ?? 0).toLocaleString('id-ID')}
                </span>
                <span className={`text-[10px] ${tokens.muted}`}>{banner.billing_period ?? '/bulan'}</span>
              </div>
            )}
          </div>
        )}
        {/* CTA */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <CTAButton
            label={ctaLabel}
            action={banner.cta_action}
            onClick={onCTAClick}
            theme={banner.theme}
          />
          <button
            onClick={onDismiss}
            className="p-2 rounded-lg hover:bg-black/10 transition-colors"
            aria-label="Tutup"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={tokens.muted}>
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

  const fmt = (n: number | null | undefined) => n ? `Rp ${n.toLocaleString('id-ID')}` : '';
  const orig = banner.original_price ?? 0;
  const disc = banner.discounted_price ?? orig;
  const savings = orig > disc ? Math.round(((orig - disc) / orig) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: tokens.overlay }}
      onClick={(e) => e.target === e.currentTarget && onDismiss()}
    >
      <div
        className={`relative w-full max-w-md ${tokens.bg} rounded-2xl ${tokens.border} border shadow-2xl overflow-hidden`}
      >
        {/* Top gradient accent bar */}
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}aa)` }} />

        <div className="p-7">
          {/* Header: logo mark + badge + headline */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-start gap-3">
              {/* Tempo logo mark */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${accentColor}18` }}
              >
                <div style={{ color: accentColor }}>
                  <BannerIcon name={banner.icon ?? 'crown'} size={20} />
                </div>
              </div>
              <div>
                {banner.badge_label && (
                  <span
                    className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white mb-1.5"
                    style={{ backgroundColor: banner.badge_color ?? accentColor }}
                  >
                    {banner.badge_label}
                  </span>
                )}
                <h2 className={`text-[17px] font-black ${tokens.text} leading-tight`}>{headline}</h2>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg hover:bg-black/10 transition-colors flex-shrink-0 -mt-0.5"
              aria-label="Tutup"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={tokens.muted}>
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Body copy */}
          {body && (
            <p className={`text-sm ${tokens.muted} leading-relaxed mb-5`}>{body}</p>
          )}

          {/* Feature bullets */}
          <div className="mb-5 space-y-2">
            {[
              'Akses tanpa batas ke semua artikel premium',
              'Investigasi mendalam & liputan eksklusif',
              'Analisis politik, ekonomi, dan keamanan',
              'Tanpa iklan interupsi',
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accentColor}25` }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke={accentColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className={`text-xs ${tokens.muted}`}>{feat}</span>
              </div>
            ))}
          </div>

          {/* Price box */}
          {banner.show_price && (
            <div
              className="mb-5 p-4 rounded-xl border"
              style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30` }}
            >
              {disc < orig ? (
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className={`text-2xl font-black ${tokens.text}`}>{fmt(disc)}<span className={`text-xs font-normal ${tokens.muted}`}>/{banner.billing_period ?? 'bulan'}</span></div>
                    <div className={`text-xs ${tokens.muted} mt-0.5`}>Harga normal: <span className="line-through">{fmt(orig)}</span></div>
                  </div>
                  <div
                    className="px-2.5 py-1 rounded-lg text-[11px] font-black text-white flex-shrink-0"
                    style={{ backgroundColor: accentColor }}
                  >
                    HEMAT {savings}%
                  </div>
                </div>
              ) : (
                <div>
                  <div className={`text-2xl font-black ${tokens.text}`}>{fmt(orig)}<span className={`text-xs font-normal ${tokens.muted}`}>/{banner.billing_period ?? 'bulan'}</span></div>
                </div>
              )}
            </div>
          )}

          {/* Trust signals */}
          <div className={`flex items-center gap-4 mb-5 text-[10px] ${tokens.muted}`}>
            <div className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>Berlangganan aman</span>
            </div>
            <div className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
              <span>Batalkan kapan saja</span>
            </div>
            <div className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>50.000+ pembaca aktif</span>
            </div>
          </div>

          {/* CTA */}
          <CTAButton
            label={ctaLabel}
            action={banner.cta_action}
            onClick={onCTAClick}
            theme={banner.theme}
          />

          {/* Dismiss */}
          {banner.cta_action !== 'DISMISS' && (
            <button
              onClick={onDismiss}
              className="w-full text-center mt-3 text-[11px] py-1 hover:opacity-70 transition-opacity"
              style={{ color: tokens.muted }}
            >
              Nanti saja, mungkin lain waktu
            </button>
          )}
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

  const fmt = (n: number | null | undefined) => n ? `Rp ${n.toLocaleString('id-ID')}` : '';
  const orig = banner.original_price ?? 0;
  const disc = banner.discounted_price ?? orig;

  return (
    <div
      className={`my-4 ${tokens.bg} rounded-xl overflow-hidden`}
      style={{ borderLeft: `4px solid ${accentColor}` }}
    >
      <div className="p-4 flex items-center gap-4">
        {/* Icon */}
        {banner.icon && (
          <div
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}18` }}
          >
            <div style={{ color: accentColor }}>
              <BannerIcon name={banner.icon} size={18} />
            </div>
          </div>
        )}
        {/* Content */}
        <div className="flex-1 min-w-0">
          {banner.badge_label && (
            <span
              className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-white mb-1"
              style={{ backgroundColor: banner.badge_color ?? accentColor }}
            >
              {banner.badge_label}
            </span>
          )}
          <p className={`text-sm font-bold ${tokens.text}`}>{headline}</p>
          {body && <p className={`text-xs ${tokens.muted} mt-0.5`}>{body}</p>}
        </div>
        {/* Price */}
        {banner.show_price && disc < orig && (
          <div className="flex-shrink-0 text-right hidden sm:block">
            <div className={`text-sm font-black ${tokens.text}`}>{fmt(disc)}</div>
            <div className={`text-[10px] line-through ${tokens.muted}`}>{fmt(orig)}/{banner.billing_period ?? 'bln'}</div>
          </div>
        )}
        {banner.show_price && disc >= orig && (
          <div className="flex-shrink-0 text-right hidden sm:block">
            <div className={`text-sm font-black ${tokens.text}`}>{fmt(orig)}</div>
            <div className={`text-[10px] ${tokens.muted}`}>{banner.billing_period ?? '/bulan'}</div>
          </div>
        )}
        {/* CTA */}
        <div className="flex-shrink-0">
          <CTAButton
            label={ctaLabel}
            action={banner.cta_action}
            onClick={onCTAClick}
            theme={banner.theme}
          />
        </div>
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
