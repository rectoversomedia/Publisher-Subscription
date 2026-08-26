'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, RefreshCw, BarChart2, Eye, MousePointerClick, TrendingUp,
  CheckCircle, XCircle, ChevronRight, Trash2, Edit3, Copy, LayoutGrid,
  Zap, ExternalLink, AlertTriangle
} from 'lucide-react';
import type { BannerWithStats, BannerType, BannerStats } from '@/domain/types';
import { BANNER_TYPE_LABELS, BANNER_TYPE_COLORS } from '@/domain/types';

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

function BannerRow({ banner, onDelete }: {
  banner: BannerWithStats;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
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
        {/* Type badge */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${colors.bg}`}>
          <span>{colors.icon}</span>
        </div>

        {/* Main info */}
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

        {/* Right: Layout + Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-lg capitalize">
            {banner.layout}
          </span>
          <Link
            href={`/dashboard/banners/${banner.id}`}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </Link>
          <button
            onClick={() => onDelete(banner.id)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <ChevronRight className="w-4 h-4 text-slate-300" />
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'active') params.set('active', 'true');
      if (typeFilter !== 'all') params.set('type', typeFilter);

      const res = await fetch(`/api/v1/banners?${params}`);
      const data = await res.json();
      setBanners(data.data ?? []);
    } catch { /* non-critical */ }
    setLoading(false);
  }, [filter, typeFilter]);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this banner?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/v1/banners/${id}`, { method: 'DELETE' });
      setBanners(prev => prev.filter(b => b.id !== id));
    } catch { /* non-critical */ }
    setDeletingId(null);
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
          <button
            onClick={fetchBanners}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link
            href="/dashboard/banners/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
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
          <Link
            href="/dashboard/banners/new"
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-50"
          >
            <Plus className="w-4 h-4" /> Create Banner
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700"
        >
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
          <Link
            href="/dashboard/banners/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> Create First Banner
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map(banner => (
            <BannerRow key={banner.id} banner={banner} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
