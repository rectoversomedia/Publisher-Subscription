'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, RefreshCw, BarChart2, Eye, MousePointerClick, TrendingUp,
  CheckCircle, XCircle, ChevronRight, Trash2, Edit3, LayoutGrid,
  Zap, TrendingDown, ArrowUpRight
} from 'lucide-react';
import type { BannerWithStats, BannerType, BannerStats, OfferBanner, BannerTheme } from '@/domain/types';
import { BANNER_TYPE_LABELS, BANNER_TYPE_COLORS } from '@/domain/types';
import { BannerIcon } from '@/components/banner/BannerIcons';

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

const TYPE_ICONS: Record<string, { icon: string; bg: string; text: string }> = {
  PROMO_OFFER:   { icon: '🔥', bg: 'bg-red-50', text: 'text-red-500' },
  REGISTRATION:  { icon: '📝', bg: 'bg-blue-500/15', text: 'text-blue-400' },
  NEWSLETTER:    { icon: '✉️', bg: 'bg-purple-500/15', text: 'text-purple-400' },
  WINBACK:       { icon: '♻️', bg: 'bg-amber-500/15', text: 'text-amber-400' },
  TRIAL:         { icon: '⏱️', bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  SAVE_OFFER:    { icon: '⚡', bg: 'bg-red-500/15', text: 'text-red-400' },
};

const THEME_TOKENS: Record<BannerTheme, { bg: string; text: string; muted: string; btnBg: string; btnText: string }> = {
  dark: { bg: 'bg-white', text: 'text-slate-900', muted: 'text-slate-400', btnBg: 'bg-red-600', btnText: 'text-slate-900' },
  light: { bg: 'bg-slate-50', text: 'text-slate-800', muted: 'text-slate-400', btnBg: 'bg-white text-[#111128] font-bold', btnText: 'text-[#111128]' },
  red: { bg: 'bg-red-600', text: 'text-slate-900', muted: 'text-red-200', btnBg: 'bg-white/20 border border-slate-300 text-slate-900 font-bold', btnText: 'text-slate-900' },
  emerald: { bg: 'bg-emerald-600', text: 'text-slate-900', muted: 'text-emerald-200', btnBg: 'bg-white/20 border border-slate-300 text-slate-900 font-bold', btnText: 'text-slate-900' },
};

function X({ className }: { className?: string }) {
  return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}

function BannerVisual({ banner }: { banner: OfferBanner }) {
  const tokens = THEME_TOKENS[banner.theme as BannerTheme] ?? THEME_TOKENS.dark;
  const accent = banner.accent_color ?? '#C41230';
  return (
    <div className="bg-slate-50 rounded-xl p-6 flex items-center justify-center min-h-[240px]">
      <div className={`relative w-full max-w-sm ${tokens.bg} rounded-2xl border border-slate-200 shadow-2xl overflow-hidden`}>
        <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {banner.icon && (
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}25` }}>
                  <div style={{ color: accent }}><BannerIcon name={banner.icon} size={18} /></div>
                </div>
              )}
              <div>
                {banner.badge_label && (
                  <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-slate-900 mb-1" style={{ backgroundColor: banner.badge_color ?? accent }}>
                    {banner.badge_label}
                  </span>
                )}
                <h3 className={`text-[14px] font-black ${tokens.text} leading-tight`}>{banner.headline}</h3>
              </div>
            </div>
            <button className={`p-1 ${tokens.muted}`}><X className="w-4 h-4" /></button>
          </div>
          {banner.body_copy && <p className={`text-[11px] ${tokens.muted} leading-relaxed mb-3`}>{banner.body_copy}</p>}
          {banner.show_price && (banner.original_price || banner.discounted_price) && (
            <div className="mb-3 p-2.5 rounded-lg" style={{ backgroundColor: `${accent}15` }}>
              <div className="flex items-baseline gap-1.5">
                {banner.discounted_price && banner.original_price && banner.original_price > banner.discounted_price && (
                  <span className={`text-[11px] line-through ${tokens.muted}`}>{fmtRp(banner.original_price)}</span>
                )}
                <span className={`text-[18px] font-black ${tokens.text}`}>{fmtRp(banner.discounted_price ?? banner.original_price ?? 0)}</span>
                <span className={`text-[10px] ${tokens.muted}`}>{banner.billing_period ?? '/month'}</span>
              </div>
            </div>
          )}
          <button className={`w-full py-2.5 rounded-xl text-[12px] font-bold ${tokens.btnBg} ${tokens.btnText} shadow-lg`}>
            {banner.cta_label}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ banner, onClose }: { banner: OfferBanner; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-[13px] font-bold text-slate-900">{banner.name}</h2>
            <p className="text-[11px] text-slate-400">{banner.headline}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-50 text-slate-400 border border-slate-300 capitalize">{banner.layout}</span>
            <span className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-50 text-slate-400 border border-slate-300 capitalize">{banner.theme}</span>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-6"><BannerVisual banner={banner} /></div>
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[11px] text-slate-300">
            <span>Type: {BANNER_TYPE_LABELS[banner.banner_type as BannerType] ?? banner.banner_type}</span>
            <span>Priority: {banner.priority}</span>
            {banner.is_ab_test && <span>A/B: {banner.variant_allocation_percentage ?? 50}% → B</span>}
          </div>
          <Link href={`/dashboard/banners/${banner.id}`}
            className="text-[11px] px-3 py-1.5 bg-red-50 border border-red-200 text-red-500 rounded-lg font-semibold hover:bg-red-100 transition-all">
            Edit Banner
          </Link>
        </div>
      </div>
    </div>
  );
}

function BannerRow({ banner, onDelete, onPreview }: { banner: BannerWithStats; onDelete: (id: string) => void; onPreview: (banner: OfferBanner) => void }) {
  const colors = TYPE_ICONS[banner.banner_type] ?? { icon: '📊', bg: 'bg-slate-50', text: 'text-slate-400' };
  const stats = banner.stats as BannerStats | null;
  const clickRate = stats && stats.total_impressions > 0 ? ((stats.total_clicks / stats.total_impressions) * 100).toFixed(1) : null;
  const convRate = stats && stats.total_clicks > 0 ? ((stats.total_conversions / stats.total_clicks) * 100).toFixed(1) : null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all group">
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${colors.bg}`}>
          <span>{colors.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
            <h3 className="text-[13px] font-bold text-slate-800">{banner.name}</h3>
            {banner.is_ab_test && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20 font-bold">A/B</span>
            )}
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${colors.bg} ${colors.text}`}>
              {BANNER_TYPE_LABELS[banner.banner_type as BannerType] ?? banner.banner_type}
            </span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
              banner.is_active
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-slate-50 text-slate-300 border border-slate-200'
            }`}>
              {banner.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 line-clamp-1 mb-3">{banner.headline}</p>
          <div className="flex items-center gap-4 flex-wrap">
            {stats ? (
              <>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="font-mono font-semibold text-slate-500">{fmtNum(stats.total_impressions)}</span>
                  <span className="text-slate-300">views</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <MousePointerClick className="w-3.5 h-3.5" />
                  <span className="font-mono font-semibold text-slate-500">{fmtNum(stats.total_clicks)}</span>
                  {clickRate && <span className="text-blue-400 font-bold">{clickRate}%</span>}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="font-mono font-semibold text-slate-500">{fmtNum(stats.total_conversions)}</span>
                  {convRate && <span className="text-emerald-400 font-bold">{convRate}%</span>}
                </div>
                {stats.total_revenue > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono font-bold text-emerald-400">{fmtRp(stats.total_revenue)}</span>
                  </div>
                )}
              </>
            ) : (
              <span className="text-[11px] text-slate-300">No data yet</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] px-2 py-1 bg-slate-50 text-slate-300 rounded-lg capitalize hidden sm:block">{banner.layout}</span>
          <button onClick={() => onPreview(banner as OfferBanner)}
            className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
            title="Preview">
            <Eye className="w-4 h-4" />
          </button>
          <Link href={`/dashboard/banners/${banner.id}`}
            className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all" title="Edit">
            <Edit3 className="w-4 h-4" />
          </Link>
          <button onClick={() => onDelete(banner.id)}
            className="p-2 text-slate-300 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
          <ChevronRight className="w-4 h-4 text-slate-200" />
        </div>
      </div>
    </div>
  );
}

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

  const displayedBanners = banners.filter(b => {
    if (typeFilter !== 'all' && b.banner_type !== typeFilter) return false;
    if (filter === 'active' && !b.is_active) return false;
    if (filter === 'inactive' && b.is_active) return false;
    return true;
  });

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={fetchBanners}
            className="flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-slate-500 bg-slate-50 border border-slate-300 rounded-xl hover:bg-slate-100 hover:text-slate-800 transition-all group">
            <RefreshCw className={`w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link href="/dashboard/banners/new"
            className="flex items-center gap-2 px-4 py-2.5 text-[12px] font-bold text-slate-900 bg-red-600 rounded-xl hover:bg-[#B01028] transition-colors shadow-lg shadow-red-900/20">
            <Plus className="w-3.5 h-3.5" /> New Banner
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Impressions', value: fmtNum(totalImpressions), icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Total Clicks', value: fmtNum(totalClicks), icon: MousePointerClick, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Avg CTR', value: `${avgCTR}%`, icon: BarChart2, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Avg CVR', value: `${avgCVR}%`, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Est. Revenue', value: totalRevenue > 0 ? fmtRp(totalRevenue) : '—', icon: TrendingUp, color: 'text-red-500', bg: 'bg-red-50' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all">
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-[18px] font-black text-slate-900 font-mono leading-none mb-1">{stat.value}</div>
              <div className="text-[10px] text-slate-400">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Active Summary */}
      <div className="bg-gradient-to-r from-red-500/10 to-red-500/5 border border-red-200 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <div className="text-[16px] font-black text-slate-900">{activeCount} Active Banners</div>
              <div className="text-[11px] text-slate-400">{banners.length} total banners</div>
            </div>
          </div>
          <Link href="/dashboard/banners/new"
            className="flex items-center gap-2 px-4 py-2.5 text-[12px] font-bold text-slate-900 bg-red-600 rounded-xl hover:bg-[#B01028] transition-colors">
            <Plus className="w-3.5 h-3.5" /> Create Banner
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                filter === f ? 'bg-red-100 text-red-500 border border-red-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}>
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 text-[12px] bg-white border border-slate-300 rounded-xl text-slate-700 focus:outline-none focus:border-red-600/40 appearance-none cursor-pointer hover:bg-[#141430] transition-all">
          <option value="all">All Types</option>
          {Object.entries(BANNER_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Banner List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-slate-50" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-50 rounded w-1/3" />
                  <div className="h-2 bg-slate-50 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : displayedBanners.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-4">
            <LayoutGrid className="w-7 h-7 text-slate-300" />
          </div>
          <h3 className="text-[13px] font-semibold text-slate-400 mb-1">No banners found</h3>
          <p className="text-[11px] text-slate-300 mb-4">Create your first banner to start monetizing readers</p>
          <Link href="/dashboard/banners/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-bold text-slate-900 bg-red-600 rounded-xl hover:bg-[#B01028] transition-colors">
            <Plus className="w-3.5 h-3.5" /> Create First Banner
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedBanners.map(banner => (
            <BannerRow key={banner.id} banner={banner} onDelete={handleDelete} onPreview={setPreviewBanner} />
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewBanner && (
        <PreviewModal banner={previewBanner} onClose={() => setPreviewBanner(null)} />
      )}
    </div>
  );
}
