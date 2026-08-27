'use client';

import { useEffect, useState, useRef } from 'react';
import {
  TrendingUp, Users, DollarSign, Target, AlertTriangle,
  Activity, FlaskConical, BarChart3, RefreshCw, ChevronRight,
  ArrowUpRight, ArrowDownRight, Zap, Eye, MousePointerClick,
  ShoppingCart, Star, Clock, Sparkles, Layers, Radio,
  ChevronDown, ChevronUp, Info
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
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)}K`;
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

// ── Animated counter ─────────────────────────────────────────

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return count;
}

// ── Live Clock ───────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState({ h: '--:--:--', d: '---' });

  useEffect(() => {
    const update = () => {
      const n = new Date();
      const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      setTime({
        h: n.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        d: `${days[n.getDay()]}, ${n.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const el = document.getElementById('liveClock');
    const dl = document.getElementById('liveDate');
    if (el) el.textContent = time.h;
    if (dl) dl.textContent = time.d;
  }, [time]);

  return null;
}

// ── Section Header ───────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
  action,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-[#C41230]/10 border border-[#C41230]/20 flex items-center justify-center">
            <Icon className="w-4.5 h-4.5 text-[#C41230]" />
          </div>
        )}
        <div>
          <h2 className="text-[15px] font-bold text-white/90">{title}</h2>
          {subtitle && <p className="text-[11px] text-white/30 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && (
        <Link
          href={action.href}
          className="flex items-center gap-1 text-[11px] text-[#C41230]/80 hover:text-[#C41230] font-semibold transition-colors group"
        >
          {action.label}
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
}

// ── Metric Card ──────────────────────────────────────────────

const CARD_CONFIGS = {
  emerald: {
    icon: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    glow: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]',
    accent: '#10B981',
  },
  blue: {
    icon: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
    glow: 'group-hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]',
    accent: '#3B82F6',
  },
  purple: {
    icon: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
    glow: 'group-hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]',
    accent: '#A855F7',
  },
  amber: {
    icon: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    glow: 'group-hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]',
    accent: '#F59E0B',
  },
  red: {
    icon: 'bg-red-500/15 text-red-400 border border-red-500/20',
    glow: 'group-hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]',
    accent: '#EF4444',
  },
  slate: {
    icon: 'bg-white/8 text-white/50 border border-white/10',
    glow: 'group-hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]',
    accent: '#94A3B8',
  },
};

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  trend,
  href,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color?: keyof typeof CARD_CONFIGS;
  trend?: { value: number; label: string };
  href?: string;
}) {
  const cfg = CARD_CONFIGS[color];
  const inner = (
    <div className={`group relative bg-[#111128] border border-white/[0.06] rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:border-white/[0.1] hover:-translate-y-0.5 ${cfg.glow} overflow-hidden`}>
      {/* Subtle top glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-full ${trend.value >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {trend.value >= 0
              ? <ArrowUpRight className="w-3 h-3" />
              : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <div className="text-[26px] font-black text-white font-mono tracking-tight leading-none mb-1.5">
        {value}
      </div>
      <div className="text-[13px] font-semibold text-white/70 leading-tight">{title}</div>
      {subtitle && (
        <div className="text-[11px] text-white/30 mt-1.5 leading-relaxed">{subtitle}</div>
      )}

      {/* Hover shimmer */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute top-0 left-[-100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ── Funnel ───────────────────────────────────────────────────

const FUNNEL_STEPS = [
  { key: 'unique_readers', label: 'Unique Readers', color: 'from-blue-500/80 to-blue-400/60', glow: 'shadow-blue-500/10' },
  { key: 'known_readers', label: 'Known Readers', color: 'from-indigo-500/80 to-indigo-400/60', glow: 'shadow-indigo-500/10' },
  { key: 'paywall_exposed', label: 'Paywall Shown', color: 'from-violet-500/80 to-violet-400/60', glow: 'shadow-violet-500/10' },
  { key: 'offer_clicks', label: 'Offer Clicks', color: 'from-purple-500/80 to-purple-400/60', glow: 'shadow-purple-500/10' },
  { key: 'checkout_starts', label: 'Checkout', color: 'from-pink-500/80 to-pink-400/60', glow: 'shadow-pink-500/10' },
  { key: 'subscriptions', label: 'Conversions', color: 'from-[#C41230]/80 to-rose-400/60', glow: 'shadow-[#C41230]/20' },
];

function FunnelCard({ funnel, funnelMax }: { funnel: FunnelData; funnelMax: number }) {
  const [expanded, setExpanded] = useState(false);
  const steps = expanded ? FUNNEL_STEPS : FUNNEL_STEPS.slice(-4);

  return (
    <div className="bg-[#111128] border border-white/[0.06] rounded-2xl overflow-hidden transition-all">
      <div className="px-6 pt-5 pb-4">
        <SectionHeader
          title="Subscription Funnel"
          subtitle="30-day conversion journey"
          icon={Layers}
        />
        <div className="space-y-3">
          {steps.map((step) => {
            const raw = funnel[step.key as keyof FunnelData] as number;
            const pct = funnelMax > 0 ? (raw / funnelMax) * 100 : 0;
            return (
              <div key={step.key} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-white/60">{step.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-white font-mono">{fmt(raw)}</span>
                    <span className="text-[10px] text-white/25 w-10 text-right">{pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${step.color} shadow-lg ${step.glow} transition-all duration-1000 ease-out group-hover:shadow-xl`}
                    style={{ width: `${Math.max(pct, 0.5)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/[0.05] px-6 py-4 flex items-center justify-between">
        <span className="text-[12px] font-medium text-white/40">Overall conversion</span>
        <div className="flex items-center gap-3">
          {FUNNEL_STEPS.map((s) => {
            const r = funnel[s.key as keyof FunnelData] as number;
            return null;
          })}
          <span className="text-[18px] font-black text-white font-mono">
            {funnelMax > 0 ? ((funnel.subscriptions / funnel.unique_readers) * 100).toFixed(2) : '0.00'}%
          </span>
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full border-t border-white/[0.05] px-6 py-2.5 flex items-center justify-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 hover:bg-white/[0.02] transition-all"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? 'Show less' : `Show all ${FUNNEL_STEPS.length} steps`}
      </button>
    </div>
  );
}

// ── Revenue Attribution ───────────────────────────────────────

function AttributionCard({ attribution }: {
  attribution: DashboardData['revenue_attribution']
}) {
  const items = [
    {
      label: 'Direct subscriptions',
      value: attribution.direct_revenue,
      pct: attribution.direct_percentage,
      color: 'emerald',
      icon: Star,
      bg: 'from-emerald-500/20 to-emerald-600/10',
      border: 'border-emerald-500/20',
      dot: 'bg-emerald-400',
    },
    {
      label: 'Revenue Brain assisted',
      value: attribution.assisted_revenue,
      pct: attribution.assisted_percentage,
      color: 'blue',
      icon: Sparkles,
      bg: 'from-blue-500/20 to-blue-600/10',
      border: 'border-blue-500/20',
      dot: 'bg-blue-400',
    },
    {
      label: 'Experiment driven',
      value: attribution.experiment_revenue,
      pct: attribution.experiment_percentage,
      color: 'purple',
      icon: FlaskConical,
      bg: 'from-purple-500/20 to-purple-600/10',
      border: 'border-purple-500/20',
      dot: 'bg-purple-400',
    },
  ];

  return (
    <div className="bg-[#111128] border border-white/[0.06] rounded-2xl p-6 h-full flex flex-col">
      <SectionHeader
        title="Revenue Attribution"
        subtitle="Where conversions come from"
        icon={PieChartIcon}
      />
      <div className="flex-1 space-y-4 mt-1">
        {items.map((item) => (
          <div key={item.label} className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${item.dot} shadow-lg`} />
                <span className="text-[12px] font-medium text-white/60">{item.label}</span>
              </div>
              <div className="text-right">
                <div className="text-[14px] font-bold text-white font-mono">{fmtRp(item.value)}</div>
                <div className="text-[10px] text-white/30">{(item.pct * 100).toFixed(1)}%</div>
              </div>
            </div>
            <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${item.bg} shadow-lg`}
                style={{ width: `${Math.max(item.pct * 100, 1)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto pt-5 border-t border-white/[0.05] flex items-center justify-between">
        <span className="text-[12px] font-semibold text-white/50">Total Revenue</span>
        <span className="text-[20px] font-black text-white font-mono">{fmtRp(attribution.total_revenue)}</span>
      </div>
    </div>
  );
}

// ── Segment Card ─────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  SHOW_MONTHLY: 'Monthly Offer',
  SHOW_ANNUAL: 'Annual Offer',
  SHOW_WINBACK: 'Win-back',
  SHOW_SAVE_OFFER: 'Save Offer',
  ALLOW_FREE: 'Free Access',
  SHOW_REGISTRATION: 'Registration',
  SHOW_TRIAL: 'Free Trial',
};

const ACTION_BG: Record<string, string> = {
  SHOW_MONTHLY: 'bg-blue-500/15 text-blue-300 border border-blue-500/20',
  SHOW_ANNUAL: 'bg-purple-500/15 text-purple-300 border border-purple-500/20',
  SHOW_WINBACK: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
  SHOW_SAVE_OFFER: 'bg-red-500/15 text-red-300 border border-red-500/20',
  ALLOW_FREE: 'bg-white/8 text-white/50 border border-white/10',
  SHOW_REGISTRATION: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
  SHOW_TRIAL: 'bg-violet-500/15 text-violet-300 border border-violet-500/20',
};

function SegmentCard({ segments }: { segments: SegmentData[] }) {
  const maxRevenue = Math.max(...segments.map((s) => s.estimated_revenue), 1);

  return (
    <div className="bg-[#111128] border border-white/[0.06] rounded-2xl p-6">
      <SectionHeader
        title="Revenue Segments"
        subtitle="Highest-value reader cohorts"
        action={{ label: 'View all', href: '/dashboard/readers' }}
        icon={Radio}
      />
      <div className="space-y-0">
        {segments.slice(0, 6).map((seg, i) => {
          const barPct = (seg.estimated_revenue / maxRevenue) * 100;
          return (
            <div key={seg.key} className="group py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] -mx-6 px-6 transition-colors rounded-xl cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-[#C41230]/10 border border-[#C41230]/20 flex items-center justify-center text-[10px] font-bold text-[#FF6B7A]">
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-white/90 leading-tight">{seg.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-white/30">{fmt(seg.count)} readers</span>
                      <span className="text-[10px] text-white/15">·</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${ACTION_BG[seg.recommended_treatment] ?? ACTION_BG.ALLOW_FREE}`}>
                        {ACTION_LABELS[seg.recommended_treatment] ?? seg.recommended_treatment}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div className="text-[14px] font-black text-white font-mono">{fmtRp(seg.estimated_revenue)}</div>
                  <div className="text-[10px] text-white/25">est. revenue</div>
                </div>
              </div>
              <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden ml-7.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#C41230]/60 to-[#C41230]/30 shadow-lg shadow-[#C41230]/10 transition-all duration-1000"
                  style={{ width: `${Math.max(barPct, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Recent Decisions Table ───────────────────────────────────

function DecisionsTable({ recent_decisions }: { recent_decisions: RecentDecision[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? recent_decisions : recent_decisions.slice(0, 8);

  return (
    <div className="bg-[#111128] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-6 pt-5 pb-4">
        <SectionHeader
          title="Revenue Brain Decisions"
          subtitle="Live decision log — newest first"
          action={{ label: 'View all', href: '/dashboard/decisions' }}
          icon={Brain}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-y border-white/[0.05]">
              {['Time', 'Reader ID', 'Decision', 'Confidence', 'Factors', 'Priority'].map((h) => (
                <th key={h} className="text-left px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white/25">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((dec) => {
              const readerId = dec.readers?.external_user_id ?? dec.readers?.anonymous_id ?? dec.reader_id;
              const shortId = readerId ? `${String(readerId).substring(0, 10)}…` : '—';
              const actionBg = ACTION_BG[dec.selected_action] ?? ACTION_BG.ALLOW_FREE;
              const actionLabel = ACTION_LABELS[dec.selected_action] ?? dec.selected_action;
              const confidence = (dec.confidence ?? 0) * 100;
              const confColor =
                confidence >= 80 ? { bar: 'bg-emerald-400', text: 'text-emerald-400', label: 'High', bg: 'bg-emerald-400/10' } :
                confidence >= 60 ? { bar: 'bg-blue-400', text: 'text-blue-400', label: 'Med', bg: 'bg-blue-400/10' } :
                { bar: 'bg-white/20', text: 'text-white/40', label: 'Low', bg: 'bg-white/5' };

              return (
                <tr key={dec.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-white/25" />
                      <span className="text-[11px] text-white/40 font-mono">{timeAgo(dec.timestamp)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <code className="text-[11px] font-mono text-white/40 bg-white/[0.05] px-2 py-1 rounded-lg border border-white/[0.06] group-hover:border-white/[0.1] transition-colors">
                      {shortId}
                    </code>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${actionBg}`}>
                      {actionLabel}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${confColor.bar} shadow-lg`}
                          style={{ width: `${confidence}%` }}
                        />
                      </div>
                      <span className={`text-[11px] font-bold ${confColor.text} w-9`}>
                        {Math.round(confidence)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {(dec.reason_codes ?? []).slice(0, 2).map((code) => (
                        <span key={code} className="text-[10px] font-medium text-white/35 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.05]">
                          {code.replace(/_/g, ' ').toLowerCase()}
                        </span>
                      ))}
                      {(dec.reason_codes ?? []).length > 2 && (
                        <span className="text-[10px] text-white/20 px-1">+{dec.reason_codes.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${confColor.bg} ${confColor.text}`}>
                      <div className={`w-1 h-1 rounded-full ${confColor.bar}`} />
                      {confColor.label}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {recent_decisions.length === 0 && (
        <div className="py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <Activity className="w-7 h-7 text-white/20" />
          </div>
          <p className="text-[13px] font-semibold text-white/40">No decisions yet</p>
          <p className="text-[11px] text-white/20 mt-1">Revenue decisions will appear here as events come in.</p>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full border-t border-white/[0.05] px-6 py-3 flex items-center justify-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 hover:bg-white/[0.02] transition-all"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? 'Show less' : `Show all ${recent_decisions.length} decisions`}
      </button>
    </div>
  );
}

// ── Mini Activity Feed ────────────────────────────────────────

function ActivityFeed({ events }: { events: RecentDecision[] }) {
  const types = [
    { key: 'subscription_success', icon: Star, color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Subscription' },
    { key: 'paywall_view', icon: Eye, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Paywall' },
    { key: 'checkout_start', icon: ShoppingCart, color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Checkout' },
    { key: 'offer_click', icon: MousePointerClick, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Offer click' },
    { key: 'register', icon: Users, color: 'text-[#C41230]', bg: 'bg-[#C41230]/10', label: 'Register' },
  ];

  const mockEvents = events.length > 0 ? events.slice(0, 6).map((d) => ({
    type: 'decision',
    action: d.selected_action,
    time: d.timestamp,
  })) : [
    { type: 'subscription_success', time: new Date(Date.now() - 120000).toISOString() },
    { type: 'paywall_view', time: new Date(Date.now() - 340000).toISOString() },
    { type: 'checkout_start', time: new Date(Date.now() - 580000).toISOString() },
    { type: 'offer_click', time: new Date(Date.now() - 900000).toISOString() },
    { type: 'register', time: new Date(Date.now() - 1200000).toISOString() },
    { type: 'paywall_view', time: new Date(Date.now() - 1500000).toISOString() },
  ];

  return (
    <div className="bg-[#111128] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-[#C41230]" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#C41230] animate-ping opacity-60" />
          </div>
          <span className="text-[12px] font-bold text-white/70">Live Activity</span>
        </div>
        <span className="text-[10px] text-white/25 font-mono">real-time</span>
      </div>
      <div className="space-y-2.5">
        {mockEvents.map((ev, i) => {
          const typeInfo = types.find((t) => t.key === ev.type) ?? types[4]!;
          const Icon = typeInfo.icon;
          const evAny = ev as { type: string; action?: string; time: string };
          return (
            <div key={i} className="flex items-center gap-3 group">
              <div className={`w-7 h-7 rounded-lg ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${typeInfo.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-white/60 leading-tight">
                  {evAny.action ? `Decision: ${ACTION_LABELS[evAny.action] ?? evAny.action}` : typeInfo.label}
                </div>
                <div className="text-[10px] text-white/25 mt-0.5">{timeAgo(ev.time as string)}</div>
              </div>
              <div className={`w-1.5 h-1.5 rounded-full ${typeInfo.color.replace('text-', 'bg-')} opacity-60`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Pie chart icon ────────────────────────────────────────────

function PieChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
      <path d="M22 12A10 10 0 0 0 12 2v10z"/>
    </svg>
  );
}

function Brain({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.94"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.94"/>
    </svg>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────

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
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error && e.name === 'AbortError'
        ? 'Database unavailable — please start Supabase'
        : e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Live clock
  useEffect(() => {
    const update = () => {
      const n = new Date();
      const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const el = document.getElementById('liveClock');
      const dl = document.getElementById('liveDate');
      if (el) el.textContent = n.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (dl) dl.textContent = `${days[n.getDay()]}, ${n.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-72 bg-white/[0.05] rounded-xl animate-pulse mb-2" />
            <div className="h-4 w-96 bg-white/[0.03] rounded-lg animate-pulse" />
          </div>
        </div>
        {/* Card skeletons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-[#111128] border border-white/[0.06] rounded-2xl p-5 h-36 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#111128] border border-white/[0.06] rounded-2xl h-72 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-2xl bg-[#C41230]/10 border border-[#C41230]/20 flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-[#C41230]/60" />
        </div>
        <h2 className="text-xl font-bold text-white/80 mb-2">Unable to load dashboard</h2>
        <p className="text-sm text-white/40 mb-6 max-w-sm">{error}</p>
        <button
          onClick={fetchData}
          className="px-6 py-3 bg-[#C41230] hover:bg-[#8B0000] text-white rounded-xl text-sm font-bold transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, funnel, segments, recent_decisions, revenue_attribution } = data;
  const funnelMax = Math.max(funnel.unique_readers, funnel.known_readers, funnel.paywall_exposed, funnel.offer_clicks, funnel.checkout_starts, funnel.subscriptions, 1);
  const overallConversion = funnel.unique_readers > 0 ? (funnel.subscriptions / funnel.unique_readers) * 100 : 0;

  return (
    <div className="space-y-6">

      {/* ── Demo Banner ────────────────────────────────────── */}
      {data._demo && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[#C41230]/08 border border-[#C41230]/20 rounded-2xl text-sm">
          <div className="w-2 h-2 rounded-full bg-[#C41230] animate-pulse flex-shrink-0" />
          <span className="text-[#FF6B7A] text-[12px]">
            <strong>Demo Mode</strong> — displaying sample data. Connect your Supabase database to see live metrics.
          </span>
        </div>
      )}

      {/* ── Page Header ──────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-black text-white tracking-tight leading-none">
            Executive Dashboard
          </h1>
          <p className="text-[11px] text-white/30 mt-2 flex items-center gap-2">
            <span>Revenue Intelligence</span>
            <span className="text-white/15">·</span>
            <span>30-day window</span>
            {lastUpdated && (
              <>
                <span className="text-white/15">·</span>
                <span className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  Updated {timeAgo(lastUpdated.toISOString())}
                </span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-white/50 bg-white/[0.04] border border-white/[0.08] rounded-xl hover:bg-white/[0.08] hover:text-white/80 transition-all flex-shrink-0 group"
        >
          <RefreshCw className={`w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── KPI Row 1 ─────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Revenue"
            value={fmtRp(kpis.total_revenue_30d)}
            subtitle={`${fmt(kpis.total_conversions_30d)} conversions`}
            icon={DollarSign}
            color="emerald"
            trend={{ value: 12, label: 'vs last month' }}
          />
          <MetricCard
            title="Conversion Rate"
            value={fmtPct(kpis.subscription_conversion)}
            subtitle={`${fmt(kpis.new_subscribers_30d)} new subscribers`}
            icon={Target}
            color="blue"
            trend={{ value: 8, label: 'vs last month' }}
          />
          <MetricCard
            title="Revenue / 1K Readers"
            value={fmtRp(kpis.revenue_per_1000_readers)}
            subtitle={`across ${fmt(kpis.active_readers_30d)} active readers`}
            icon={TrendingUp}
            color="purple"
          />
          <MetricCard
            title="Avg. Estimated LTV"
            value={fmtRp(kpis.avg_ltv)}
            subtitle="Based on propensity + engagement scoring"
            icon={BarChart3}
            color="slate"
          />
        </div>
      </section>

      {/* ── KPI Row 2 ─────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="High-Propensity Audience"
            value={fmt(kpis.high_propensity_audience)}
            subtitle="Readers with propensity score ≥ 60"
            icon={Zap}
            color="amber"
            trend={{ value: 23, label: 'new this week' }}
          />
          <MetricCard
            title="Revenue Opportunity"
            value={fmtRp(kpis.revenue_opportunity)}
            subtitle="Estimated incremental value at scale"
            icon={Activity}
            color="emerald"
          />
          <MetricCard
            title="Subscribers at Risk"
            value={fmt(kpis.subscribers_at_risk)}
            subtitle="Active subs with churn risk ≥ 75"
            icon={AlertTriangle}
            color="red"
            href="/dashboard/opportunities"
          />
          <MetricCard
            title="Active Experiments"
            value={String(data.active_experiments?.length ?? 0)}
            subtitle="Running A/B tests"
            icon={FlaskConical}
            color="purple"
            href="/dashboard/experiments"
          />
        </div>
      </section>

      {/* ── 3-Column Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Funnel */}
        <FunnelCard funnel={funnel} funnelMax={funnelMax} />

        {/* Attribution */}
        <AttributionCard attribution={revenue_attribution} />

        {/* Right column: segments + activity */}
        <div className="space-y-5">
          <SegmentCard segments={segments} />
          <ActivityFeed events={recent_decisions} />
        </div>
      </div>

      {/* ── Recent Decisions ─────────────────────────────── */}
      <DecisionsTable recent_decisions={recent_decisions} />

    </div>
  );
}
