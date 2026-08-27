// @ts-nocheck
'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search, ChevronLeft, ChevronRight, Users, Brain,
  TrendingUp, AlertTriangle, Zap, Filter, RefreshCw,
  Phone, Mail, User, ArrowUpRight, Star,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

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

// ── Helpers ─────────────────────────────────────────────────

function getReaderName(reader: Reader): string {
  if (reader.name) return reader.name;
  if (reader.email) return reader.email;
  if (reader.identity_status === 'REGISTERED' || reader.identity_status === 'KNOWN') return 'Known Reader';
  if (reader.anonymous_id) return `Anon #${reader.anonymous_id.slice(-6)}`;
  return 'Unknown';
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

// ── Score color ───────────────────────────────────────────────

function ScorePill({ value, type }: { value: number; type: 'propensity' | 'churn' | 'engagement' | 'price' }) {
  const color = (() => {
    if (type === 'churn') {
      if (value >= 75) return { bg: 'bg-red-500/15 text-red-400 border border-red-500/20', label: 'High' };
      if (value >= 50) return { bg: 'bg-amber-500/15 text-amber-400 border border-amber-500/20', label: 'Med' };
      return { bg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20', label: 'Low' };
    }
    if (value >= 80) return { bg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20', label: 'Very High' };
    if (value >= 60) return { bg: 'bg-blue-500/15 text-blue-400 border border-blue-500/20', label: 'High' };
    if (value >= 30) return { bg: 'bg-amber-500/15 text-amber-400 border border-amber-500/20', label: 'Medium' };
    return { bg: 'bg-slate-50 text-slate-400 border border-slate-300', label: 'Low' };
  })();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${color.bg}`}>
      {formatScore(value)}
    </span>
  );
}

// ── Status Badge ──────────────────────────────────────────────

const SUB_STATUS: Record<string, { label: string; bg: string; dot: string }> = {
  ACTIVE:   { label: 'Active',   bg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20', dot: 'bg-emerald-400' },
  EXPIRED:  { label: 'Expired',  bg: 'bg-red-500/15 text-red-400 border border-red-500/20', dot: 'bg-red-400' },
  TRIAL:    { label: 'Trial',    bg: 'bg-blue-500/15 text-blue-400 border border-blue-500/20', dot: 'bg-blue-400' },
  NONE:     { label: 'Free',    bg: 'bg-slate-50 text-slate-400 border border-slate-300', dot: 'bg-white/20' },
};

const IDENTITY_STATUS: Record<string, { label: string; bg: string }> = {
  KNOWN:     { label: 'Known',    bg: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  REGISTERED:{ label: 'Registered', bg: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  ANONYMOUS: { label: 'Anonymous', bg: 'bg-slate-50 text-slate-300 border border-slate-300' },
  UNKNOWN:   { label: 'Unknown',  bg: 'bg-slate-50 text-slate-300 border border-slate-200' },
};

// ── Avatar ───────────────────────────────────────────────────

const AV_COLORS = ['bg-blue-500/30', 'bg-purple-500/30', 'bg-emerald-500/30', 'bg-amber-500/30', 'bg-red-100', 'bg-pink-500/30'];

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    ? name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : '??';
  const colorIdx = name ? name.charCodeAt(0) % AV_COLORS.length : 0;
  return (
    <div
      className={`${AV_COLORS[colorIdx]} rounded-lg flex items-center justify-center text-[11px] font-bold text-slate-900 border border-slate-200 flex-shrink-0`}
      style={{ width: size, height: size, minWidth: size }}
    >
      {initials}
    </div>
  );
}

// ── Reader Table Row ─────────────────────────────────────────

function ReaderRow({ reader, index }: { reader: Reader; index: number }) {
  const name = getReaderName(reader);
  const subSt = SUB_STATUS[reader.subscription_status] ?? SUB_STATUS.NONE;
  const idSt = IDENTITY_STATUS[reader.identity_status] ?? IDENTITY_STATUS.UNKNOWN;
  const f = reader.features;
  const decision = (() => {
    if (!f) return 'ALLOW_FREE';
    if (f.subscription_propensity >= 80) return 'SHOW_ANNUAL';
    if (f.subscription_propensity >= 60) return 'SHOW_MONTHLY';
    if (f.subscription_propensity >= 30) return 'SHOW_REGISTRATION';
    return 'ALLOW_FREE';
  })();

  return (
    <tr
      className="border-b border-slate-200 hover:bg-slate-50 transition-all group cursor-pointer"
      onClick={() => window.location.href = `/dashboard/readers/${reader.id}`}
    >
      {/* ID */}
      <td className="px-4 py-3.5">
        <code className="text-[10px] font-mono text-slate-300">
          {reader.anonymous_id ? `anon_${reader.anonymous_id.slice(-8)}` : reader.id.slice(0, 10) + '…'}
        </code>
      </td>

      {/* Name + contact */}
      <td className="px-4 py-3.5 min-w-[200px]">
        <div className="flex items-center gap-3">
          <Avatar name={name} />
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-slate-900 truncate">{name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              {reader.email && (
                <span className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-blue-400 transition-colors">
                  <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate max-w-[140px]">{reader.email}</span>
                </span>
              )}
              {reader.phone && (
                <span className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-emerald-400 transition-colors">
                  <Phone className="w-2.5 h-2.5 flex-shrink-0" />
                  <span>{reader.phone}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Identity */}
      <td className="px-4 py-3.5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${idSt.bg}`}>
          {idSt.label}
        </span>
      </td>

      {/* Subscription */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${subSt.dot}`} />
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${subSt.bg}`}>
            {subSt.label}
          </span>
        </div>
      </td>

      {/* Engagement */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
              style={{ width: `${f?.engagement_score ?? 0}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-slate-500 w-6">{formatScore(f?.engagement_score ?? 0)}</span>
        </div>
      </td>

      {/* Propensity */}
      <td className="px-4 py-3.5">
        <ScorePill value={f?.subscription_propensity ?? 0} type="propensity" />
      </td>

      {/* Price Sensitivity */}
      <td className="px-4 py-3.5">
        <ScorePill value={f?.price_sensitivity ?? 0} type="price" />
      </td>

      {/* Churn */}
      <td className="px-4 py-3.5">
        {reader.subscription_status === 'ACTIVE' && f
          ? <ScorePill value={f.churn_risk} type="churn" />
          : <span className="text-[10px] text-slate-300">—</span>
        }
      </td>

      {/* LTV */}
      <td className="px-4 py-3.5">
        {f?.predicted_ltv
          ? <span className="text-[12px] font-mono font-bold text-slate-600">Rp {fmt(f.predicted_ltv)}</span>
          : <span className="text-[10px] text-slate-300">—</span>
        }
      </td>

      {/* Last seen */}
      <td className="px-4 py-3.5">
        <span className="text-[11px] text-slate-400 font-mono">{timeAgo(reader.last_seen_at)}</span>
      </td>

      {/* Decision */}
      <td className="px-4 py-3.5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
          decision === 'SHOW_MONTHLY' ? 'bg-red-50 text-red-500 border border-red-200' :
          decision === 'SHOW_ANNUAL' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20' :
          decision === 'SHOW_REGISTRATION' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
          'bg-slate-50 text-slate-400 border border-slate-300'
        }`}>
          {decision.replace(/_/g, ' ')}
        </span>
      </td>

      {/* Arrow */}
      <td className="px-4 py-3.5">
        <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
      </td>
    </tr>
  );
}

// ── Readers Content ───────────────────────────────────────────

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

  // Stats summary
  const highIntent = filteredReaders.filter(r => (r.features?.subscription_propensity ?? 0) >= 60).length;
  const activeSubs = filteredReaders.filter(r => r.subscription_status === 'ACTIVE').length;
  const atRisk = filteredReaders.filter(r => r.subscription_status === 'ACTIVE' && (r.features?.churn_risk ?? 0) >= 75).length;

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 tracking-tight leading-none">
            Reader Explorer
          </h1>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-2">
            <span>{fmt(total)} total readers</span>
            <span className="text-slate-200">·</span>
            <span>{highIntent} high-intent</span>
            <span className="text-slate-200">·</span>
            <span className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-emerald-400" />
              {activeSubs} active subscribers
            </span>
            {atRisk > 0 && (
              <>
                <span className="text-slate-200">·</span>
                <span className="flex items-center gap-1 text-red-400/60">
                  <div className="w-1 h-1 rounded-full bg-red-400" />
                  {atRisk} at risk
                </span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={fetchReaders}
          className="flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-slate-500 bg-slate-50 border border-slate-300 rounded-xl hover:bg-slate-100 hover:text-slate-800 transition-all group"
        >
          <RefreshCw className={`w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Stats row ─────────────────────────────────── */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Readers', value: fmt(total), icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'High Intent', value: highIntent, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Active Subs', value: activeSubs, icon: Star, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'At Risk', value: atRisk, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Avg Propensity', value: filteredReaders.length > 0 ? Math.round(filteredReaders.reduce((a, r) => a + (r.features?.subscription_propensity ?? 0), 0) / filteredReaders.length) : 0, icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'New Today', value: '—', icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all">
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-[20px] font-black text-slate-900 font-mono leading-none mb-1">{stat.value}</div>
              <div className="text-[10px] text-slate-400">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* ── Filters ────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
          <input
            type="text"
            placeholder="Search name, email, phone, reader ID..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-white/20 focus:outline-none focus:border-red-600/40 focus:bg-[#141430] transition-all"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
          <select
            value={filterStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="pl-8 pr-4 py-2.5 text-[12px] bg-white border border-slate-300 rounded-xl text-slate-700 focus:outline-none focus:border-red-600/40 appearance-none cursor-pointer hover:bg-[#141430] transition-all"
          >
            <option value="">All Status</option>
            <option value="NONE">Non-subscriber</option>
            <option value="ACTIVE">Active Subscriber</option>
            <option value="EXPIRED">Expired</option>
            <option value="TRIAL">Trial</option>
          </select>
        </div>

        <select
          value={filterPropensity}
          onChange={(e) => handlePropensityChange(e.target.value)}
          className="px-4 py-2.5 text-[12px] bg-white border border-slate-300 rounded-xl text-slate-700 focus:outline-none focus:border-red-600/40 appearance-none cursor-pointer hover:bg-[#141430] transition-all"
        >
          <option value="">All Propensity</option>
          <option value="80">Very High (≥80)</option>
          <option value="60">High (≥60)</option>
          <option value="30">Medium (≥30)</option>
        </select>
      </div>

      {/* ── Table ──────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200">
                {['Reader ID', 'Identity', 'Identity Status', 'Subscription', 'Engagement', 'Propensity', 'Price Sens.', 'Churn Risk', 'Est. LTV', 'Last Seen', 'Decision', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-300">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-200">
                    {[...Array(12)].map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3 bg-slate-50 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredReaders.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-7 h-7 text-slate-300" />
                    </div>
                    <p className="text-[13px] font-semibold text-slate-400">No readers found</p>
                    <p className="text-[11px] text-slate-300 mt-1">Try adjusting your filters or search query.</p>
                  </td>
                </tr>
              ) : (
                filteredReaders.map((reader, i) => (
                  <ReaderRow key={reader.id} reader={reader} index={i} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 bg-slate-100">
          <span className="text-[11px] text-slate-300">
            Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {fmt(total)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-2 border border-slate-300 rounded-lg text-slate-400 hover:text-slate-600 hover:border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[12px] text-slate-500 font-mono px-3">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => goToPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-2 border border-slate-300 rounded-lg text-slate-400 hover:text-slate-600 hover:border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
