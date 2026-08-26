'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, Filter, ChevronLeft, ChevronRight, Users, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';

interface ReaderFeature {
  engagement_score: number;
  subscription_propensity: number;
  price_sensitivity: number;
  content_loyalty: number;
  churn_risk: number;
  predicted_ltv: number;
}

interface Reader {
  id: string;
  anonymous_id: string | null;
  external_user_id: string | null;
  identity_status: string;
  subscription_status: string;
  last_seen_at: string;
  features: ReaderFeature | null;
}

function getScoreColor(score: number, type: 'propensity' | 'churn' | 'engagement' | 'price'): string {
  if (type === 'churn') {
    if (score >= 75) return 'bg-red-100 text-red-700';
    if (score >= 50) return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
  }
  if (score >= 80) return 'bg-emerald-100 text-emerald-700';
  if (score >= 60) return 'bg-blue-100 text-blue-700';
  if (score >= 30) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

function formatScore(score: number): string {
  return score > 0 ? String(Math.round(score)) : '—';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatRupiah(value: number): string {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export default function ReadersPage() {
  const [readers, setReaders] = useState<Reader[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPropensity, setFilterPropensity] = useState('');

  const limit = 25;

  const fetchReaders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (filterStatus) params.set('subscription_status', filterStatus);
      if (filterPropensity) params.set('propensity_min', filterPropensity);

      const res = await fetch(`/api/v1/readers?${params}`);
      const json = await res.json();
      setReaders(json.data ?? []);
      setTotal(json.pagination?.total ?? 0);
      setTotalPages(json.pagination?.pages ?? 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterPropensity]);

  useEffect(() => { fetchReaders(); }, [fetchReaders]);

  const filteredReaders = search
    ? readers.filter((r) =>
        r.id.includes(search) ||
        r.anonymous_id?.includes(search) ||
        r.external_user_id?.includes(search)
      )
    : readers;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reader Explorer</h1>
        <p className="text-sm text-slate-500 mt-1">
          {total.toLocaleString('id-ID')} total readers · Click any reader for full profile and decision history
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by reader ID, anonymous ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="NONE">Non-subscriber</option>
          <option value="ACTIVE">Active Subscriber</option>
          <option value="EXPIRED">Expired</option>
          <option value="TRIAL">Trial</option>
        </select>
        <select
          value={filterPropensity}
          onChange={(e) => { setFilterPropensity(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Propensity</option>
          <option value="80">Very High (≥80)</option>
          <option value="60">High (≥60)</option>
          <option value="30">Medium (≥30)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Reader ID', 'Identity', 'Subscription', 'Engagement', 'Propensity', 'Price Sens.', 'Churn Risk', 'Est. LTV', 'Last Seen', 'Recommended Action'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {[...Array(10)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-20 bg-slate-100 rounded animate-shimmer" /></td>
                    ))}
                  </tr>
                ))
              ) : filteredReaders.map((reader) => {
                const f = reader.features;
                const displayId = reader.external_user_id ?? reader.anonymous_id ?? reader.id.substring(0, 8);
                return (
                  <tr
                    key={reader.id}
                    className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/dashboard/readers/${reader.id}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{reader.id.substring(0, 12)}…</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        reader.identity_status === 'REGISTERED' || reader.identity_status === 'KNOWN'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'bg-slate-50 text-slate-600 border border-slate-100'
                      }`}>
                        {reader.identity_status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        reader.subscription_status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : reader.subscription_status === 'EXPIRED'
                            ? 'bg-red-50 text-red-700 border border-red-100'
                            : 'bg-slate-50 text-slate-600 border border-slate-100'
                      }`}>
                        {reader.subscription_status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${f?.engagement_score ?? 0}%` }} />
                        </div>
                        <span className={`text-xs font-medium w-8 ${getScoreColor(f?.engagement_score ?? 0, 'engagement').split(' ').slice(0, 2).join(' ')}`}>
                          {formatScore(f?.engagement_score ?? 0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getScoreColor(f?.subscription_propensity ?? 0, 'propensity')}`}>
                        {formatScore(f?.subscription_propensity ?? 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{formatScore(f?.price_sensitivity ?? 0)}</td>
                    <td className="px-4 py-3">
                      {reader.subscription_status === 'ACTIVE' ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getScoreColor(f?.churn_risk ?? 0, 'churn')}`}>
                          {formatScore(f?.churn_risk ?? 0)}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-700">{f?.predicted_ltv ? formatRupiah(f.predicted_ltv) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{timeAgo(reader.last_seen_at)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                        {f?.subscription_propensity && f.subscription_propensity >= 80
                          ? 'SHOW_ANNUAL'
                          : f?.subscription_propensity && f.subscription_propensity >= 60
                            ? 'SHOW_MONTHLY'
                            : f?.subscription_propensity && f.subscription_propensity >= 30
                              ? 'SHOW_REGISTRATION'
                              : 'ALLOW_FREE'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
          <span className="text-xs text-slate-500">
            Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total.toLocaleString('id-ID')}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
