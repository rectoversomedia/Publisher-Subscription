'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp, Users, DollarSign, Target, AlertTriangle,
  Activity, FlaskConical, BarChart3, ArrowUpRight,
  ArrowDownRight, Zap, RefreshCw
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
// Plain integer with comma separators — no k/M/Rp/jt/rb suffixes

function fmt(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtPct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
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

// ── KPI Card ────────────────────────────────────────────────

function KPICard({
  title, value, subtitle, icon: Icon, trend, color = 'blue'
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  color?: string;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
    red: 'bg-red-50 border-red-100 text-red-600',
    purple: 'bg-purple-50 border-purple-100 text-purple-600',
    slate: 'bg-slate-50 border-slate-100 text-slate-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color] ?? colors.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-sm font-medium text-slate-700">{title}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
}

// ── Funnel Step ─────────────────────────────────────────────

function FunnelStep({ label, value, max, rate }: { label: string; value: number; max: number; rate?: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-xs text-slate-600 text-right">{label}</div>
      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-20 text-xs font-medium text-slate-700">{fmt(value)}</div>
      {rate !== undefined && (
        <div className="w-16 text-xs text-slate-500">{rate.toFixed(1)}%</div>
      )}
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
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
            <h1 className="text-2xl font-bold text-slate-900">Executive Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Loading reader revenue intelligence...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 h-28 animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Unable to load dashboard</h2>
        <p className="text-sm text-slate-500 mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
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
    funnel.subscriptions
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Executive Dashboard</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-700">Live</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Tempo Reader Revenue Brain — Incremental revenue intelligence
            {lastUpdated && (
              <span className="ml-2">· Updated {timeAgo(lastUpdated.toISOString())}</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Reader Revenue (30d)"
          value={fmt(kpis.total_revenue_30d)}
          subtitle={`${fmt(kpis.total_conversions_30d)} conversions`}
          icon={DollarSign}
          color="emerald"
        />
        <KPICard
          title="Conversion Rate"
          value={fmtPct(kpis.subscription_conversion)}
          subtitle={`${fmt(kpis.new_subscribers_30d)} new subscribers`}
          icon={Target}
          color="blue"
        />
        <KPICard
          title="Revenue / 1K Readers"
          value={fmt(kpis.revenue_per_1000_readers)}
          subtitle={`${fmt(kpis.active_readers_30d)} active readers`}
          icon={TrendingUp}
          color="purple"
        />
        <KPICard
          title="Avg. Estimated LTV"
          value={fmt(kpis.avg_ltv)}
          subtitle="Heuristic estimate"
          icon={BarChart3}
          color="slate"
        />
      </div>

      {/* Second KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="High-Propensity Audience"
          value={fmt(kpis.high_propensity_audience)}
          subtitle="Propensity >= 60"
          icon={Zap}
          color="amber"
        />
        <KPICard
          title="Revenue Opportunity"
          value={fmt(kpis.revenue_opportunity)}
          subtitle="Estimated at scale"
          icon={Activity}
          color="emerald"
        />
        <KPICard
          title="Subscribers at Risk"
          value={fmt(kpis.subscribers_at_risk)}
          subtitle="Churn risk >= 75"
          icon={AlertTriangle}
          color="red"
        />
        <Link href="/dashboard/experiments">
          <KPICard
            title="Active Experiments"
            value={String(data.active_experiments?.length ?? 0)}
            subtitle="Running A/B tests"
            icon={FlaskConical}
            color="purple"
          />
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscription Funnel */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900">Subscription Funnel</h2>
            <span className="text-xs text-slate-500">Last 30 days</span>
          </div>
          <div className="space-y-3">
            <FunnelStep label="Unique Readers" value={funnel.unique_readers} max={funnelMax} />
            <FunnelStep label="Known Readers" value={funnel.known_readers} max={funnelMax} />
            <FunnelStep label="Paywall Exposed" value={funnel.paywall_exposed} max={funnelMax} />
            <FunnelStep label="Offer Clicks" value={funnel.offer_clicks} max={funnelMax} />
            <FunnelStep label="Checkout Starts" value={funnel.checkout_starts} max={funnelMax} />
            <FunnelStep
              label="Subscriptions"
              value={funnel.subscriptions}
              max={funnelMax}
              rate={funnel.unique_readers > 0 ? (funnel.subscriptions / funnel.unique_readers) * 100 : 0}
            />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Overall conversion</span>
              <span className="font-semibold text-slate-900">
                {funnel.unique_readers > 0
                  ? ((funnel.subscriptions / funnel.unique_readers) * 100).toFixed(2)
                  : '0.00'}%
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Attribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-5">Revenue Attribution (30d)</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-600">Direct subscriptions</span>
                <span className="font-medium text-slate-900">{fmt(revenue_attribution.direct_revenue)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${revenue_attribution.direct_percentage * 100}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-1">{(revenue_attribution.direct_percentage * 100).toFixed(1)}% of revenue</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-600">Revenue Brain assisted</span>
                <span className="font-medium text-slate-900">{fmt(revenue_attribution.assisted_revenue)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${revenue_attribution.assisted_percentage * 100}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-1">{(revenue_attribution.assisted_percentage * 100).toFixed(1)}% of revenue</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-600">Experiment driven</span>
                <span className="font-medium text-slate-900">{fmt(revenue_attribution.experiment_revenue)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${revenue_attribution.experiment_percentage * 100}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-1">{(revenue_attribution.experiment_percentage * 100).toFixed(1)}% of revenue</div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-slate-900">Total</span>
              <span className="text-lg font-bold text-slate-900">{fmt(revenue_attribution.total_revenue)}</span>
            </div>
          </div>
        </div>

        {/* Reader Segments */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900">Top Revenue Segments</h2>
            <Link href="/dashboard/readers" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {segments.slice(0, 5).map((seg) => (
              <div key={seg.key} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <div className="text-sm font-medium text-slate-800">{seg.name}</div>
                  <div className="text-xs text-slate-500">{fmt(seg.count)} readers</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{fmt(seg.estimated_revenue)}</div>
                  <div className="text-xs text-slate-500">est. revenue</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Decisions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-900">Recent Revenue Brain Decisions</h2>
          <Link href="/dashboard/decisions" className="text-xs text-blue-600 hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Time</th>
                <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reader</th>
                <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Decision</th>
                <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Confidence</th>
                <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason Codes</th>
              </tr>
            </thead>
            <tbody>
              {recent_decisions.map((dec) => {
                const readerId = dec.readers?.external_user_id ?? dec.readers?.anonymous_id ?? dec.reader_id;
                const shortId = readerId ? `${String(readerId).substring(0, 8)}…` : '—';
                return (
                  <tr key={dec.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3 text-slate-500">{timeAgo(dec.timestamp)}</td>
                    <td className="py-3 font-mono text-xs">{shortId}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {dec.selected_action}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(dec.confidence ?? 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-600">{Math.round((dec.confidence ?? 0) * 100)}%</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {(dec.reason_codes ?? []).slice(0, 2).map((code) => (
                          <span key={code} className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {code.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {recent_decisions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    No decisions yet. Events will generate decisions automatically.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
