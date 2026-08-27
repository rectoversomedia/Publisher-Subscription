'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

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
  email_hash: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  identity_status: string;
  subscription_status: string;
  last_seen_at: string;
  features: ReaderFeature | null;
}

function getReaderName(reader: Reader): string {
  if (reader.name) return reader.name;
  if (reader.email) return reader.email;
  if (reader.identity_status === 'REGISTERED' || reader.identity_status === 'KNOWN') return 'Known Reader';
  if (reader.anonymous_id) return `Anon #${reader.anonymous_id.slice(-6)}`;
  return 'Unknown';
}

function getIdentityLabel(reader: Reader): string {
  if (reader.name) return reader.name;
  if (reader.email) return reader.email;
  if (reader.identity_status === 'REGISTERED' || reader.identity_status === 'KNOWN') return 'Known';
  if (reader.anonymous_id) return `Anon #${reader.anonymous_id.slice(-6)}`;
  return 'Unknown';
}

function formatContact(reader: Reader): string {
  if (reader.phone) return reader.phone;
  if (reader.email) return reader.email;
  return '';
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

function fmt(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function buildReadersUrl(status: string, propensity: string, searchTerm: string, pageNum: number) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (propensity) params.set('propensity', propensity);
  if (searchTerm) params.set('search', searchTerm);
  if (pageNum > 1) params.set('page', String(pageNum));
  const qs = params.toString();
  return `/dashboard/readers${qs ? `?${qs}` : ''}`;
}

function ReadersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [readers, setReaders] = useState<Reader[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') ?? '');
  const [filterPropensity, setFilterPropensity] = useState(searchParams.get('propensity') ?? '');

  const limit = 25;

  const fetchReaders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
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
        r.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.email?.toLowerCase().includes(search.toLowerCase()) ||
        r.anonymous_id?.includes(search) ||
        r.external_user_id?.includes(search)
      )
    : readers;

  const goToPage = (newPage: number) => {
    setPage(newPage);
    router.push(buildReadersUrl(filterStatus, filterPropensity, search, newPage));
  };

  const handleStatusChange = (val: string) => {
    setFilterStatus(val);
    setPage(1);
    router.push(buildReadersUrl(val, filterPropensity, search, 1));
  };

  const handlePropensityChange = (val: string) => {
    setFilterPropensity(val);
    setPage(1);
    router.push(buildReadersUrl(filterStatus, val, search, 1));
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    router.replace(buildReadersUrl(filterStatus, filterPropensity, val, 1));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reader Explorer</h1>
        <p className="text-sm text-slate-500 mt-1">
          {fmt(total)} total readers · Filters sync to URL for deep-linking
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, reader ID..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
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
          onChange={(e) => handlePropensityChange(e.target.value)}
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
                {['Name / Identity', 'Subscription', 'Engagement', 'Propensity', 'Price Sens.', 'Churn Risk', 'Est. LTV', 'Last Seen', 'Action'].map((h) => (
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
                return (
                  <tr
                    key={reader.id}
                    className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/dashboard/readers/${reader.id}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-slate-600">
                        {reader.anonymous_id
                          ? `anon_${reader.anonymous_id.slice(-8)}`
                          : reader.id.substring(0, 12) + '…'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 text-sm">{getReaderName(reader)}</div>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        {reader.email && (
                          <div className="flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 flex-shrink-0"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            <span className="text-[10px] text-slate-500 truncate max-w-[160px]">{reader.email}</span>
                          </div>
                        )}
                        {reader.phone && (
                          <div className="flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 flex-shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 2.2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            <span className="text-[10px] text-slate-500">{reader.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            reader.identity_status === 'REGISTERED' || reader.identity_status === 'KNOWN'
                              ? 'bg-blue-50 text-blue-700 border border-blue-100'
                              : 'bg-slate-50 text-slate-500 border border-slate-100'
                          }`}>
                            {reader.identity_status.toLowerCase()}
                          </span>
                        </div>
                      </div>
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
                        <span className="text-xs font-medium w-8">{formatScore(f?.engagement_score ?? 0)}</span>
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
                    <td className="px-4 py-3 text-xs font-medium text-slate-700">{f?.predicted_ltv ? fmt(f.predicted_ltv) : '—'}</td>
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
            Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {fmt(total)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => goToPage(Math.min(totalPages, page + 1))}
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

export default function ReadersPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400">Loading readers…</div>}>
      <ReadersContent />
    </Suspense>
  );
}
