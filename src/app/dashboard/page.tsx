'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp, Users, DollarSign, Target, AlertTriangle,
  Activity, FlaskConical, BarChart3, ArrowUpRight,
  ArrowDownRight, Zap, RefreshCw, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

// ── Types ───────────────────────────────────────────────────

interface KPIData {
  reader_revenue: number;
  subscription_conversion: number;
  revenue_per_1000_readers: number;
  high_propensity_audience: number;
  revenue_opportunity: number;
  subscribers_at_risk: number;
  active_readers_30d: number;
  new_subscribers_30d: number;
  total_conversions_30d: number;
  total_revenue_30d: number;
  avg_ltv: number;
}

interface FunnelData {
  unique_readers: number;
  known_readers: number;
  paywall_exposed: number;
  offer_clicks: number;
  checkout_starts: number;
  subscriptions: number;
}

interface SegmentData {
  name: string;
  key: string;
  count: number;
  conversion_rate: number;
  avg_ltv: number;
  estimated_revenue: number;
  recommended_treatment: string;
}

interface RecentDecision {
  id: string;
  reader_id: string;
  selected_action: string;
  confidence: number;
  reason_codes: string[];
  timestamp: string;
  readers?: {
    anonymous_id?: string;
    external_user_id?: string;
    subscription_status: string;
  };
}

interface DashboardData {
  kpis: KPIData;
  funnel: FunnelData;
  segments: SegmentData[];
  recent_decisions: RecentDecision[];
  revenue_attribution: {
    total_revenue: number;
    direct_revenue: number;
    experiment_revenue: number;
    assisted_revenue: number;
    experiment_percentage: number;
    assisted_percentage: number;
    direct_percentage: number;
  };
  active_experiments: unknown[];
  generated_at: string;
}

// ── Formatters ───────────────────────────────────────────────

function fmt(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtPct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function fmtRp(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

// ── Section Header ───────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-[15px] font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          {action.label}
          <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

// ── KPI Card ────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  SHOW_MONTHLY: 'Monthly Offer',
  SHOW_ANNUAL: 'Annual Offer',
  SHOW_WINBACK: 'Win-back',
  SHOW_SAVE_OFFER: 'Save Offer',
  ALLOW_FREE: 'Free Access',
  SHOW_REGISTRATION: 'Registration',
};

const ACTION_COLORS: Record<string, string> = {
  SHOW_MONTHLY: 'bg-blue-100 text-blue-700 border-blue-200',
  SHOW_ANNUAL: 'bg-purple-100 text-purple-700 border-purple-200',
  SHOW_WINBACK: 'bg-amber-100 text-amber-700 border-amber-200',
  SHOW_SAVE_OFFER: 'bg-red-100 text-red-700 border-red-200',
  ALLOW_FREE: 'bg-slate-100 text-slate-600 border-slate-200',
  SHOW_REGISTRATION: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  href,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color?: 'emerald' | 'blue' | 'purple' | 'amber' | 'red' | 'slate';
  href?: string;
}) {
  const colorMap = {
    emerald: { icon: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-600', bg: 'bg-emerald-50' },
    blue: { icon: 'bg-blue-50 text-blue-600', text: 'text-blue-600', bg: 'bg-blue-50' },
    purple: { icon: 'bg-purple-50 text-purple-600', text: 'text-purple-600', bg: 'bg-purple-50' },
    amber: { icon: 'bg-amber-50 text-amber-600', text: 'text-amber-600', bg: 'bg-amber-50' },
    red: { icon: 'bg-red-50 text-red-600', text: 'text-red-600', bg: 'bg-red-50' },
    slate: { icon: 'bg-slate-50 text-slate-600', text: 'text-slate-600', bg: 'bg-slate-50' },
  };
  const c = colorMap[color];

  const inner = (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all duration-150 cursor-pointer group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-sm font-medium text-slate-700 leading-tight">{title}</div>
      {subtitle && (
        <div className="text-xs text-slate-500 mt-1.5 leading-relaxed">{subtitle}</div>
      )}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ── Funnel Visualizer ────────────────────────────────────────

const FUNNEL_STEPS = [
  { key: 'unique_readers', label: 'Unique Readers', color: 'from-blue-400 to-blue-500' },
  { key: 'known_readers', label: 'Known Readers', color: 'from-blue-500 to-indigo-500' },
  { key: 'paywall_exposed', label: 'Paywall Shown', color: 'from-indigo-500 to-violet-500' },
  { key: 'offer_clicks', label: 'Offer Clicks', color: 'from-violet-500 to-purple-500' },
  { key: 'checkout_starts', label: 'Checkout', color: 'from-purple-500 to-pink-500' },
  { key: 'subscriptions', label: 'Conversions', color: 'from-pink-500 to-rose-500' },
];

// ── Main Dashboard ──────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData & { _demo?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch('/api/dashboard', { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        setError('Database unavailable — please start Supabase');
      } else {
        setError(e instanceof Error ? e.message : 'Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-64 bg-slate-200 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-80 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Unable to load dashboard</h2>
        <p className="text-sm text-slate-500 mb-5 max-w-sm">{error}</p>
        <button
          onClick={fetchData}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, funnel, segments, recent_decisions, revenue_attribution } = data;
  const funnelMax = Math.max(
    funnel.unique_readers,
    funnel.known_readers,
    funnel.paywall_exposed,
    funnel.offer_clicks,
    funnel.checkout_starts,
    funnel.subscriptions,
    1
  );
  const overallConversion =
    funnel.unique_readers > 0
      ? (funnel.subscriptions / funnel.unique_readers) * 100
      : 0;

  return (
    <div className="space-y-8">
      {/* ── DEMO BANNER ──────────────────────────────────────── */}
      {data._demo && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-sm">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          <span className="text-amber-800">
            <strong>Demo Mode</strong> — displaying sample data. Connect your Supabase database to see live metrics.
          </span>
        </div>
      )}

      {/* ── PAGE HEADER ───────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Executive Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tempo Reader Revenue Brain · 30-day window
            {lastUpdated && (
              <span className="ml-2 text-slate-400">· Updated {timeAgo(lastUpdated.toISOString())}</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all flex-shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── KPI ROW 1: Revenue & Conversion ─────────────────── */}
      <section>
        <SectionHeader title="Revenue & Conversion" subtitle="Core business metrics — last 30 days" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Revenue"
            value={fmtRp(kpis.total_revenue_30d)}
            subtitle={`${fmt(kpis.total_conversions_30d)} conversions`}
            icon={DollarSign}
            color="emerald"
          />
          <KPICard
            title="Conversion Rate"
            value={fmtPct(kpis.subscription_conversion)}
            subtitle={`${fmt(kpis.new_subscribers_30d)} new subscribers this month`}
            icon={Target}
            color="blue"
          />
          <KPICard
            title="Revenue / 1K Readers"
            value={fmtRp(kpis.revenue_per_1000_readers)}
            subtitle={`across ${fmt(kpis.active_readers_30d)} active readers`}
            icon={TrendingUp}
            color="purple"
          />
          <KPICard
            title="Avg. Estimated LTV"
            value={fmtRp(kpis.avg_ltv)}
            subtitle="Based on propensity + engagement scoring"
            icon={BarChart3}
            color="slate"
          />
        </div>
      </section>

      {/* ── KPI ROW 2: Audience & Risk ──────────────────────── */}
      <section>
        <SectionHeader title="Audience & Risk Signals" subtitle="Opportunity and churn indicators" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="High-Propensity Audience"
            value={fmt(kpis.high_propensity_audience)}
            subtitle="Readers with propensity score ≥ 60"
            icon={Zap}
            color="amber"
          />
          <KPICard
            title="Revenue Opportunity"
            value={fmtRp(kpis.revenue_opportunity)}
            subtitle="Estimated incremental value at scale"
            icon={Activity}
            color="emerald"
          />
          <KPICard
            title="Subscribers at Risk"
            value={fmt(kpis.subscribers_at_risk)}
            subtitle="Active subs with churn risk ≥ 75"
            icon={AlertTriangle}
            color="red"
          />
          <KPICard
            title="Active Experiments"
            value={String(data.active_experiments?.length ?? 0)}
            subtitle="Running A/B tests"
            icon={FlaskConical}
            color="purple"
            href="/dashboard/experiments"
          />
        </div>
      </section>

      {/* ── MAIN 3-COLUMN GRID ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Subscription Funnel ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <SectionHeader
            title="Subscription Funnel"
            subtitle="Last 30 days · click-through journey"
          />
          <div className="space-y-2.5">
            {FUNNEL_STEPS.map((step) => {
              const raw = funnel[step.key as keyof FunnelData] as number;
              const pct = funnelMax > 0 ? (raw / funnelMax) * 100 : 0;
              return (
                <div key={step.key} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-600">{step.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">{fmt(raw)}</span>
                      <span className="text-[10px] text-slate-400 w-10 text-right">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${step.color} rounded-full transition-all duration-700`}
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Overall conversion</span>
            <div className="text-right">
              <span className="text-base font-bold text-slate-900">{overallConversion.toFixed(2)}%</span>
              <span className="text-xs text-slate-400 block">reader → subscriber</span>
            </div>
          </div>
        </div>

        {/* ── Revenue Attribution ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <SectionHeader
            title="Revenue Attribution"
            subtitle="Where conversions are coming from"
          />
          <div className="space-y-5">
            {[
              {
                label: 'Direct subscriptions',
                value: revenue_attribution.direct_revenue,
                pct: revenue_attribution.direct_percentage,
                color: 'bg-emerald-500',
                colorLight: 'bg-emerald-50 text-emerald-700',
              },
              {
                label: 'Revenue Brain assisted',
                value: revenue_attribution.assisted_revenue,
                pct: revenue_attribution.assisted_percentage,
                color: 'bg-blue-500',
                colorLight: 'bg-blue-50 text-blue-700',
              },
              {
                label: 'Experiment driven',
                value: revenue_attribution.experiment_revenue,
                pct: revenue_attribution.experiment_percentage,
                color: 'bg-purple-500',
                colorLight: 'bg-purple-50 text-purple-700',
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-600">{item.label}</span>
                  <span className="text-sm font-semibold text-slate-800">{fmtRp(item.value)}</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.max(item.pct * 100, 1)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-slate-400">of total revenue</span>
                  <span className="text-[10px] font-medium text-slate-500">{(item.pct * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Total Revenue</span>
              <span className="text-lg font-bold text-slate-900">{fmtRp(revenue_attribution.total_revenue)}</span>
            </div>
          </div>
        </div>

        {/* ── Top Revenue Segments ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <SectionHeader
            title="Revenue Segments"
            subtitle="Highest-value reader cohorts"
            action={{ label: 'View all', href: '/dashboard/readers' }}
          />
          <div className="space-y-1">
            {segments.slice(0, 5).map((seg) => {
              const maxRevenue = Math.max(...segments.map((s) => s.estimated_revenue), 1);
              const barPct = (seg.estimated_revenue / maxRevenue) * 100;
              return (
                <div key={seg.key} className="py-2.5 border-b border-slate-50 last:border-0 group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <div className="text-sm font-medium text-slate-800 leading-tight">{seg.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {fmt(seg.count)} readers · {ACTION_LABELS[seg.recommended_treatment] ?? seg.recommended_treatment}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="text-sm font-bold text-slate-900">{fmtRp(seg.estimated_revenue)}</div>
                      <div className="text-[10px] text-slate-400">est. revenue</div>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(barPct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── RECENT DECISIONS ───────────────────────────────── */}
      <section>
        <SectionHeader
          title="Recent Revenue Brain Decisions"
          subtitle="Live decision log — newest first"
          action={{ label: 'View all decisions', href: '/dashboard/decisions' }}
        />
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Time</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Reader ID</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Decision</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Confidence</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Reason Codes</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent_decisions.map((dec) => {
                  const readerId =
                    dec.readers?.external_user_id ?? dec.readers?.anonymous_id ?? dec.reader_id;
                  const shortId = readerId ? `${String(readerId).substring(0, 8)}…` : '—';
                  const actionColorClass =
                    ACTION_COLORS[dec.selected_action] ?? 'bg-slate-100 text-slate-600 border-slate-200';
                  const actionLabel =
                    ACTION_LABELS[dec.selected_action] ?? dec.selected_action;
                  const confidence = (dec.confidence ?? 0) * 100;
                  const confColor =
                    confidence >= 80 ? 'bg-emerald-100' :
                    confidence >= 60 ? 'bg-blue-100' :
                    'bg-slate-100';
                  const confTextColor =
                    confidence >= 80 ? 'text-emerald-700' :
                    confidence >= 60 ? 'text-blue-700' :
                    'text-slate-600';

                  return (
                    <tr key={dec.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {timeAgo(dec.timestamp)}
                      </td>
                      <td className="px-5 py-3.5">
                        <code className="text-[11px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {shortId}
                        </code>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${actionColorClass}`}>
                          {actionLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${confidence >= 80 ? 'bg-emerald-500' : confidence >= 60 ? 'bg-blue-500' : 'bg-slate-400'}`}
                              style={{ width: `${confidence}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${confTextColor} whitespace-nowrap`}>
                            {Math.round(confidence)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(dec.reason_codes ?? []).slice(0, 2).map((code) => (
                            <span
                              key={code}
                              className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md"
                            >
                              {code.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {(dec.reason_codes ?? []).length > 2 && (
                            <span className="text-[10px] text-slate-400 px-1">
                              +{dec.reason_codes.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${confColor} ${confTextColor}`}>
                          <div className={`w-1 h-1 rounded-full ${confidence >= 80 ? 'bg-emerald-500' : confidence >= 60 ? 'bg-blue-500' : 'bg-slate-400'}`} />
                          {confidence >= 80 ? 'High' : confidence >= 60 ? 'Med' : 'Low'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {recent_decisions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Activity className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500 font-medium">No decisions yet</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Revenue decisions will appear here as events come in.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
