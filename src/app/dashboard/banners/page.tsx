'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, RefreshCw, BarChart2, Eye, MousePointerClick, TrendingUp,
  CheckCircle, XCircle, ChevronRight, Trash2, Edit3, LayoutGrid,
  Zap
} from 'lucide-react';
import type { BannerWithStats, BannerType, BannerStats, OfferBanner, BannerTheme } from '@/domain/types';
import { BANNER_TYPE_LABELS, BANNER_TYPE_COLORS } from '@/domain/types';
import { BannerIcon } from '@/components/banner/BannerIcons';

// ── Helpers ────────────────────────────────────────────────────

function fmtRp(n: number) {
  if (!n) return '—';
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function fmtNum(n: number | null | undefined) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`;
  return String(n);
}

// ── Stats Card ─────────────────────────────────────────────────

function StatsCard({ label, value, icon: Icon, color = 'blue' }: {
  label: string; value: string | number; icon: React.ElementType; color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50', red: 'text-red-600 bg-red-50',
    emerald: 'text-emerald-600 bg-emerald-50', amber: 'text-amber-600 bg-amber-50',
    purple: 'text-purple-600 bg-purple-50', slate: 'text-slate-600 bg-slate-50',
  };
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-sm font-bold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

// ── Banner Visual Preview ───────────────────────────────────────

const THEME_TOKENS: Record<BannerTheme, {
  bg: string; text: string; muted: string;
  btnBg: string; btnText: string;
}> = {
  dark: { bg: 'bg-slate-900', text: 'text-white', muted: 'text-slate-300', btnBg: 'bg-red-600', btnText: 'text-white' },
  light: { bg: 'bg-white', text: 'text-slate-900', muted: 'text-slate-500', btnBg: 'bg-slate-900', btnText: 'text-white' },
  red: { bg: 'bg-red-600', text: 'text-white', muted: 'text-red-100', btnBg: 'bg-white', btnText: 'text-red-700' },
  emerald: { bg: 'bg-emerald-600', text: 'text-white', muted: 'text-emerald-100', btnBg: 'bg-white', btnText: 'text-emerald-700' },
};

function BannerVisual({ banner }: { banner: OfferBanner }) {
  const tokens = THEME_TOKENS[banner.theme as BannerTheme] ?? THEME_TOKENS.dark;
  const accent = banner.accent_color ?? '#DC2626';

  if (banner.layout === 'modal') {
    return (
      <div className="bg-slate-100 rounded-xl p-6 flex items-center justify-center min-h-[260px]">
        <div className={`relative w-full max-w-sm ${tokens.bg} rounded-2xl border border-white/20 shadow-2xl overflow-hidden`}>
          {/* Top accent */}
          <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {banner.icon && (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}25` }}>
                    <div style={{ color: accent }}><BannerIcon name={banner.icon} size={20} /></div>
                  </div>
                )}
                <div>
                  {banner.badge_label && (
                    <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-white mb-1" style={{ backgroundColor: banner.badge_color ?? accent }}>
                      {banner.badge_label}
                    </span>
                  )}
                  <h3 className={`text-base font-black ${tokens.text} leading-tight`}>{banner.headline}</h3>
                </div>
              </div>
              <button className={`p-1.5 ${tokens.muted}`}><X className="w-4 h-4" /></button>
            </div>
            {banner.body_copy && (
              <p className={`text-xs ${tokens.muted} leading-relaxed mb-4`}>{banner.body_copy}</p>
            )}
            {banner.show_price && (banner.original_price || banner.discounted_price) && (
              <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: `${accent}15` }}>
                <div className="flex items-baseline gap-1.5">
                  {banner.discounted_price && banner.original_price && banner.original_price > banner.discounted_price && (
                    <span className={`text-xs line-through ${tokens.muted}`}>{fmtRp(banner.original_price)}</span>
                  )}
                  <span className={`text-xl font-black ${tokens.text}`}>
                    {fmtRp(banner.discounted_price ?? banner.original_price ?? 0)}
                  </span>
                  <span className={`text-xs ${tokens.muted}`}>{banner.billing_period ?? '/month'}</span>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button className={`w-full py-2.5 rounded-xl text-sm font-bold ${tokens.btnBg} ${tokens.btnText} shadow-lg`}>
                {banner.cta_label}
              </button>
              <button className={`w-full py-1.5 text-xs ${tokens.muted} text-center`}>
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (banner.layout === 'slide_in') {
    return (
      <div className="bg-slate-100 rounded-xl p-6 flex items-center justify-center min-h-[260px]">
        <div className="w-full max-w-2xl">
          <div className="flex items-center gap-4 p-4 rounded-xl shadow-2xl" style={{ backgroundColor: tokens.bg === 'bg-slate-900' ? '#0f172a' : tokens.bg === 'bg-white' ? '#ffffff' : tokens.bg === 'bg-red-600' ? '#dc2626' : '#059669', borderTop: `3px solid ${accent}` }}>
            {banner.icon && (
              <div className="flex-shrink-0" style={{ color: accent }}><BannerIcon name={banner.icon} size={28} /></div>
            )}
            <div className="flex-1 min-w-0">
              {banner.badge_label && (
                <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-white mb-1" style={{ backgroundColor: banner.badge_color ?? accent }}>
                  {banner.badge_label}
                </span>
              )}
              <p className={`text-sm font-bold ${tokens.text}`}>{banner.headline}</p>
              {banner.body_copy && <p className={`text-xs ${tokens.muted} mt-0.5`}>{banner.body_copy}</p>}
            </div>
            {banner.show_price && (banner.original_price || banner.discounted_price) && (
              <div className="hidden md:block flex-shrink-0">
                <div className="flex items-baseline gap-1">
                  <span className={`text-lg font-black ${tokens.text}`}>{fmtRp(banner.discounted_price ?? banner.original_price ?? 0)}</span>
                  <span className={`text-xs ${tokens.muted}`}>{banner.billing_period ?? '/month'}</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button className={`px-4 py-2 rounded-xl text-sm font-bold ${tokens.btnBg} ${tokens.btnText}`}>
                {banner.cta_label}
              </button>
              <button className={`p-2 ${tokens.muted}`}><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="text-center text-xs text-slate-400 mt-2">Slide-in preview — appears at bottom of screen</div>
        </div>
      </div>
    );
  }

  // inline / banner
  return (
    <div className="bg-slate-100 rounded-xl p-6 flex items-center justify-center min-h-[260px]">
      <div className="w-full max-w-xl" style={{ borderLeft: `4px solid ${accent}` }}>
        <div className={`p-4 rounded-r-xl ${tokens.bg === 'bg-slate-900' ? 'bg-slate-900' : tokens.bg === 'bg-white' ? 'bg-white' : tokens.bg === 'bg-red-600' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <div className="flex items-center gap-4">
            {banner.icon && <div className="flex-shrink-0" style={{ color: accent }}><BannerIcon name={banner.icon} size={22} /></div>}
            <div className="flex-1">
              <p className={`text-sm font-bold ${tokens.text}`}>{banner.headline}</p>
              {banner.body_copy && <p className={`text-xs ${tokens.muted} mt-0.5`}>{banner.body_copy}</p>}
            </div>
            <button className={`px-4 py-2 rounded-xl text-sm font-bold ${tokens.btnBg} ${tokens.btnText}`}>
              {banner.cta_label}
            </button>
          </div>
        </div>
        <div className="text-center text-xs text-slate-400 mt-2">Inline preview — embedded in article content</div>
      </div>
    </div>
  );
}

// ── X icon inline ──────────────────────────────────────────────

function X({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

// ── Preview Modal ──────────────────────────────────────────────

function PreviewModal({ banner, onClose }: { banner: OfferBanner; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Banner Preview</h2>
            <p className="text-xs text-slate-500">{banner.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-lg capitalize">{banner.layout}</span>
            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-lg capitalize">{banner.theme}</span>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Banner visual */}
        <div className="p-6">
          <BannerVisual banner={banner} />
        </div>
        {/* Footer info */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Type: {BANNER_TYPE_LABELS[banner.banner_type as BannerType] ?? banner.banner_type}</span>
            <span>Priority: {banner.priority}</span>
            <span>A/B: {banner.is_ab_test ? `${banner.variant_allocation_percentage ?? 50}% → B` : 'No'}</span>
          </div>
          <Link
            href={`/dashboard/banners/${banner.id}`}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Edit Banner
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Banner Row ────────────────────────────────────────────────

function BannerRow({ banner, onDelete, onPreview }: {
  banner: BannerWithStats;
  onDelete: (id: string) => void;
  onPreview: (banner: OfferBanner) => void;
}) {
  const colors = BANNER_TYPE_COLORS[banner.banner_type as BannerType] ?? BANNER_TYPE_COLORS.PROMO_OFFER;
  const stats = banner.stats as BannerStats | null;
  const clickRate = stats && stats.total_impressions > 0
    ? ((stats.total_clicks / stats.total_impressions) * 100).toFixed(1)
    : null;
  const convRate = stats && stats.total_clicks > 0
    ? ((stats.total_conversions / stats.total_clicks) * 100).toFixed(1)
    : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors group">
      <div className="flex items-start gap-4">
        {/* Type icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${colors.bg}`}>
          <span>{colors.icon}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900">{banner.name}</h3>
            {banner.is_ab_test && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">A/B</span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${colors.bg} ${colors.text}`}>
              {BANNER_TYPE_LABELS[banner.banner_type as BannerType] ?? banner.banner_type}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              banner.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {banner.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{banner.headline}</p>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {stats ? (
              <>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="font-medium">{fmtNum(stats.total_impressions)}</span>
                  <span className="text-slate-400">views</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <MousePointerClick className="w-3.5 h-3.5" />
                  <span className="font-medium">{fmtNum(stats.total_clicks)}</span>
                  {clickRate && <span className="text-emerald-600 font-semibold">({clickRate}%)</span>}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="font-medium">{fmtNum(stats.total_conversions)}</span>
                  {convRate && <span className="text-emerald-600 font-semibold">({convRate}%)</span>}
                </div>
                {stats.total_revenue > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="font-medium text-emerald-700">{fmtRp(stats.total_revenue)}</span>
                  </div>
                )}
              </>
            ) : (
              <span className="text-xs text-slate-400">No data yet</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-lg capitalize hidden sm:block">
            {banner.layout}
          </span>
          <button
            onClick={() => onPreview(banner as OfferBanner)}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Preview banner"
          >
            <Eye className="w-4 h-4" />
          </button>
          <Link
            href={`/dashboard/banners/${banner.id}`}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit banner"
          >
            <Edit3 className="w-4 h-4" />
          </Link>
          <button
            onClick={() => onDelete(banner.id)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete banner"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function BannersPage() {
  const [banners, setBanners] = useState<BannerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [previewBanner, setPreviewBanner] = useState<OfferBanner | null>(null);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'active') params.set('active', 'true');
      const res = await fetch(`/api/v1/banners?${params}`);
      const data = await res.json();
      setBanners(data.data ?? []);
    } catch { /* non-critical */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this banner? This cannot be undone.')) return;
    await fetch(`/api/v1/banners/${id}`, { method: 'DELETE' });
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  const totalImpressions = banners.reduce((s, b) => s + ((b.stats as BannerStats)?.total_impressions ?? 0), 0);
  const totalClicks = banners.reduce((s, b) => s + ((b.stats as BannerStats)?.total_clicks ?? 0), 0);
  const totalConversions = banners.reduce((s, b) => s + ((b.stats as BannerStats)?.total_conversions ?? 0), 0);
  const totalRevenue = banners.reduce((s, b) => s + ((b.stats as BannerStats)?.total_revenue ?? 0), 0);
  const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0';
  const avgCVR = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0';
  const activeCount = banners.filter(b => b.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Offer Banner Manager</h1>
          <p className="text-sm text-slate-500 mt-1">Manage all Tempo+ offer banners</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchBanners} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link href="/dashboard/banners/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Banner
          </Link>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatsCard label="Total Impressions" value={fmtNum(totalImpressions)} icon={Eye} color="blue" />
        <StatsCard label="Total Clicks" value={fmtNum(totalClicks)} icon={MousePointerClick} color="purple" />
        <StatsCard label="Avg CTR" value={`${avgCTR}%`} icon={BarChart2} color="amber" />
        <StatsCard label="Avg CVR" value={`${avgCVR}%`} icon={CheckCircle} color="emerald" />
        <StatsCard label="Est. Revenue" value={fmtRp(totalRevenue)} icon={TrendingUp} color="emerald" />
      </div>

      {/* Active Banners Summary */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold">{activeCount} Active Banners</div>
              <div className="text-xs text-blue-200">{banners.length} total banners</div>
            </div>
          </div>
          <Link href="/dashboard/banners/new" className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-50">
            <Plus className="w-4 h-4" /> Create Banner
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700">
          <option value="all">All Types</option>
          {Object.entries(BANNER_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Banner List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                  <div className="h-2 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <LayoutGrid className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-slate-600 font-semibold mb-1">No banners yet</h3>
          <p className="text-slate-400 text-sm mb-4">Create your first banner to start monetizing readers</p>
          <Link href="/dashboard/banners/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
            <Plus className="w-4 h-4" /> Create First Banner
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map(banner => (
            <BannerRow
              key={banner.id}
              banner={banner}
              onDelete={handleDelete}
              onPreview={setPreviewBanner}
            />
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewBanner && (
        <PreviewModal
          banner={previewBanner}
          onClose={() => setPreviewBanner(null)}
        />
      )}
    </div>
  );
}
