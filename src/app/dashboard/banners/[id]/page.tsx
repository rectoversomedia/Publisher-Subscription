'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Trash2, RefreshCw, Eye, MousePointerClick, CheckCircle,
  TrendingUp, BarChart2, AlertTriangle, Copy, ExternalLink, Save,
  RotateCcw
} from 'lucide-react';
import BannerBuilder from '@/components/banner/BannerBuilder';
import type { OfferBanner, BannerStats, BannerWithStats } from '@/domain/types';
import { BANNER_TYPE_LABELS, BANNER_TYPE_COLORS } from '@/domain/types';

function fmtRp(n: number | null | undefined) {
  if (!n) return '—';
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function fmtNum(n: number | null | undefined) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`;
  return String(n);
}

function MiniStatCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700', emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700', amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700', slate: 'bg-slate-50 text-slate-700',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-xl font-black ${color ?? 'text-slate-900'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function EditBannerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [banner, setBanner] = useState<Partial<OfferBanner> | null>(null);
  const [stats, setStats] = useState<BannerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'edit' | 'stats'>('edit');

  const fetchBanner = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/banners/${id}`);
      const data = await res.json();
      if (!res.ok || !data.data) {
        router.push('/dashboard/banners');
        return;
      }
      const full: BannerWithStats = data.data;
      setBanner(full);
      setStats(full.stats ?? null);
    } catch { router.push('/dashboard/banners'); }
    setLoading(false);
  }, [id, router]);

  useEffect(() => { fetchBanner(); }, [fetchBanner]);

  const handleSave = async (updated: Partial<OfferBanner>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/banners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Error: ${data.error}`);
        return;
      }
      setBanner(data.data);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this banner? This action cannot be undone.')) return;
    await fetch(`/api/v1/banners/${id}`, { method: 'DELETE' });
    router.push('/dashboard/banners');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-200 rounded w-48 animate-pulse" />
        <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!banner) return null;

  const colors = BANNER_TYPE_COLORS[banner.banner_type as keyof typeof BANNER_TYPE_COLORS] ?? BANNER_TYPE_COLORS.PROMO_OFFER;
  const ctr = stats && stats.total_impressions > 0
    ? ((stats.total_clicks / stats.total_impressions) * 100).toFixed(1)
    : '0';
  const cvr = stats && stats.total_clicks > 0
    ? ((stats.total_conversions / stats.total_clicks) * 100).toFixed(1)
    : '0';
  const variantAImp = stats?.variant_a_impressions ?? 0;
  const variantBImp = stats?.variant_b_impressions ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/banners" className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{banner.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colors.bg} ${colors.text}`}>
                {BANNER_TYPE_LABELS[banner.banner_type as keyof typeof BANNER_TYPE_LABELS] ?? banner.banner_type}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                banner.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {banner.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{banner.headline}</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" /> Hapus
        </button>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 text-sm">Performa Banner</h2>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setTab('edit')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  tab === 'edit' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                }`}
              >Edit</button>
              <button
                onClick={() => setTab('stats')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  tab === 'stats' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                }`}
              >Statistik</button>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <MiniStatCard label="Impressions" value={fmtNum(stats.total_impressions)} />
            <MiniStatCard label="Unique Readers" value={fmtNum(stats.unique_readers)} />
            <MiniStatCard label="Clicks" value={fmtNum(stats.total_clicks)} color="text-purple-700" />
            <MiniStatCard label="CTR" value={`${ctr}%`} color="text-blue-700" />
            <MiniStatCard label="Conversions" value={fmtNum(stats.total_conversions)} color="text-emerald-700" />
            <MiniStatCard label="Revenue" value={fmtRp(stats.total_revenue)} color="text-emerald-700" />
          </div>
          {banner.is_ab_test && (variantAImp + variantBImp) > 0 && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">A/B Test Result</div>
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-600">Variant A: </span>
                  <span className="font-bold text-slate-900">{fmtNum(variantAImp)} views</span>
                </div>
                <div className="flex-1 max-w-xs">
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex">
                    <div className="bg-blue-500 h-full" style={{ width: `${(variantAImp / (variantAImp + variantBImp)) * 100}%` }} />
                    <div className="bg-purple-500 h-full" style={{ width: `${(variantBImp / (variantAImp + variantBImp)) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <span className="text-slate-600">Variant B: </span>
                  <span className="font-bold text-slate-900">{fmtNum(variantBImp)} views</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content */}
      {tab === 'edit' ? (
        <BannerBuilder
          initialBanner={banner}
          onSave={handleSave}
          saving={saving}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Chart visualization — coming soon.</p>
          <p className="text-xs text-slate-300 mt-1">Use the A/B test data above for now.</p>
        </div>
      )}
    </div>
  );
}
