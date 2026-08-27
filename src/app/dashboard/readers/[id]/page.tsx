// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, User, Activity, Target, DollarSign, AlertTriangle,
  TrendingUp, Clock, FlaskConical, Brain, ChevronRight, RefreshCw,
  TrendingDown, Eye, MousePointer, ShoppingCart, BookOpen, ArrowUpRight
} from 'lucide-react';

interface ReaderFeature {
  engagement_score: number;
  subscription_propensity: number;
  price_sensitivity: number;
  content_loyalty: number;
  churn_risk: number;
  predicted_ltv: number;
  sessions_7d: number;
  sessions_30d: number;
  articles_7d: number;
  articles_30d: number;
  premium_articles_30d: number;
  avg_scroll_depth: number;
  avg_completion_rate: number;
  paywall_views_30d: number;
  offer_clicks_30d: number;
  checkout_starts_30d: number;
  days_since_last_visit: number;
}

interface TopicAffinity {
  topic: string;
  score: number;
  article_count: number;
}

interface Decision {
  id: string;
  selected_action: string;
  confidence: number;
  reason_codes: string[];
  score_snapshot: Record<string, number>;
  timestamp: string;
  selected_offer_id: string | null;
  experiment_id: string | null;
  execution_mode: string;
}

interface ReaderEvent {
  event_id: string;
  event_name: string;
  timestamp: string;
  article_id: string | null;
  session_id: string;
  metadata: Record<string, unknown>;
}

function fmt(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtRp(value: number): string {
  if (!value) return '—';
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ScoreRing({ value, size = 80, stroke = 7 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, value);
  const filled = circ * pct / 100;
  const color = value >= 75 ? '#22C55E' : value >= 50 ? '#F59E0B' : '#C41230';
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

function ScoreBar({ label, value, color = '#3B82F6', sublabel }: { label: string; value: number; color?: string; sublabel?: string }) {
  const pct = Math.min(100, value);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/40">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-mono font-bold text-white/80">{value}</span>
          {sublabel && <span className="text-[10px] text-white/25">{sublabel}</span>}
        </div>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }}
        />
      </div>
    </div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  ALLOW_FREE: 'Free Access',
  SHOW_REGISTRATION: 'Registration Wall',
  SHOW_NEWSLETTER_GATE: 'Newsletter Gate',
  SHOW_MONTHLY: 'Monthly Subscription',
  SHOW_ANNUAL: 'Annual Subscription',
  SHOW_TRIAL: 'Free Trial',
  SHOW_SAVE_OFFER: 'Save Offer',
  SHOW_WINBACK: 'Winback',
  NO_ACTION: 'No Action',
};

const EVENT_COLORS: Record<string, string> = {
  subscription: '#22C55E',
  paywall: '#F59E0B',
  checkout: '#EF4444',
  article: '#3B82F6',
  session: '#8B5CF6',
  register: '#06B6D4',
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  session_start: <Activity className="w-3 h-3" />,
  article_view: <Eye className="w-3 h-3" />,
  paywall_view: <AlertTriangle className="w-3 h-3" />,
  subscription_offer_click: <MousePointer className="w-3 h-3" />,
  checkout_start: <ShoppingCart className="w-3 h-3" />,
  subscription_success: <DollarSign className="w-3 h-3" />,
  register: <User className="w-3 h-3" />,
};

export default function ReaderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<{
    reader: Record<string, unknown> & {
      features: ReaderFeature | null;
      topic_affinity: TopicAffinity[];
      anonymous_id: string | null;
      external_user_id: string | null;
      name: string | null;
      email: string | null;
      phone: string | null;
      subscription_status: string;
      identity_status: string;
      last_seen_at: string;
      created_at: string;
    };
    decisions: Decision[];
    events: ReaderEvent[];
    experiment_assignments: unknown[];
    latest_decision_explanation: { explanation: string } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/v1/readers/${id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-white/10 border-t-[#C41230] rounded-full animate-spin" />
        <span className="text-[12px] text-white/30">Loading reader profile…</span>
      </div>
    </div>
  );

  if (!data?.reader) return (
    <div className="text-center py-20">
      <AlertTriangle className="w-12 h-12 text-white/20 mx-auto mb-3" />
      <p className="text-[14px] font-semibold text-white/40">Reader not found</p>
      <Link href="/dashboard/readers" className="text-[12px] text-[#C41230]/60 hover:text-[#C41230] mt-2 inline-block">Back to readers</Link>
    </div>
  );

  const reader = data.reader;
  const features = reader.features;
  const topics = [...(reader.topic_affinity ?? [])].sort((a, b) => b.score - a.score);

  const isKnown = reader.identity_status === 'REGISTERED' || reader.identity_status === 'KNOWN';
  const displayName = reader.name ?? reader.email ?? reader.anonymous_id
    ? `Anon #${reader.anonymous_id!.slice(-6)}`
    : 'Reader Tidak Dikenal';

  const decision = (() => {
    if (!features) return 'ALLOW_FREE';
    if (features.subscription_propensity >= 80) return 'SHOW_ANNUAL';
    if (features.subscription_propensity >= 60) return 'SHOW_MONTHLY';
    if (features.subscription_propensity >= 30) return 'SHOW_REGISTRATION';
    return 'ALLOW_FREE';
  })();

  const getDecisionColor = (d: string) => {
    if (d === 'SHOW_MONTHLY' || d === 'SHOW_ANNUAL') return 'text-[#FF6B7A] bg-[#C41230]/15 border border-[#C41230]/20';
    if (d === 'SHOW_REGISTRATION') return 'text-blue-400 bg-blue-500/15 border border-blue-500/20';
    return 'text-white/40 bg-white/[0.05] border border-white/[0.08]';
  };

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/readers" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.07] transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-black text-white tracking-tight truncate">{displayName}</h1>
          <p className="text-[11px] text-white/25 font-mono mt-0.5">
            {reader.anonymous_id ? `anon_${reader.anonymous_id.slice(-8)}` : id?.slice(0, 16) + '…'}
            <button onClick={fetchData} className="ml-3 text-white/15 hover:text-white/40 transition-colors">
              <RefreshCw className="w-3 h-3 inline" />
            </button>
          </p>
        </div>
        {/* Decision badge */}
        <span className={`px-3 py-1.5 rounded-xl text-[11px] font-bold ${getDecisionColor(decision)}`}>
          {ACTION_LABELS[decision] ?? decision}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left Column ─────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Identity Card */}
          <div className="bg-[#111128] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#C41230]/30 to-[#C41230]/10 border border-[#C41230]/20 flex items-center justify-center">
                <User className="w-5 h-5 text-[#FF6B7A]" />
              </div>
              <div>
                <div className="text-[13px] font-bold text-white/90">{displayName}</div>
                <div className={`text-[10px] font-semibold mt-0.5 ${isKnown ? 'text-blue-400' : 'text-white/25'}`}>
                  {isKnown ? 'Known Reader' : 'Anonymous'}
                </div>
              </div>
            </div>

            {/* Contact info */}
            {isKnown && (reader.email || reader.phone || reader.name) && (
              <div className="p-3 bg-[#C41230]/8 border border-[#C41230]/15 rounded-xl mb-4">
                <div className="text-[9px] font-bold uppercase tracking-widest text-[#C41230]/60 mb-2 px-1">Contact Info</div>
                {reader.name && (
                  <div className="flex items-center gap-2.5 py-1.5 border-b border-white/[0.05] last:border-0">
                    <User className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <div>
                      <div className="text-[9px] text-white/20">Name</div>
                      <div className="text-[12px] font-semibold text-white/80">{reader.name}</div>
                    </div>
                  </div>
                )}
                {reader.email && (
                  <div className="flex items-center gap-2.5 py-1.5 border-b border-white/[0.05] last:border-0">
                    <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <div>
                      <div className="text-[9px] text-white/20">Email</div>
                      <div className="text-[12px] font-semibold text-white/80">{reader.email}</div>
                    </div>
                  </div>
                )}
                {reader.phone && (
                  <div className="flex items-center gap-2.5 py-1.5">
                    <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 2.2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <div>
                      <div className="text-[9px] text-white/20">Phone</div>
                      <div className="text-[12px] font-semibold text-white/80">{reader.phone}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2.5">
              {[
                ['Identity Status', reader.identity_status, isKnown ? 'text-blue-400' : 'text-white/30'],
                ['Subscription', reader.subscription_status,
                  reader.subscription_status === 'ACTIVE' ? 'text-emerald-400' :
                  reader.subscription_status === 'EXPIRED' ? 'text-red-400' : 'text-white/30'],
                ['Last Active', timeAgo(reader.last_seen_at), 'text-white/30'],
                ['Member Since', timeAgo(reader.created_at), 'text-white/30'],
              ].map(([label, value, colorClass]) => (
                <div key={String(label)} className="flex items-center justify-between">
                  <span className="text-[11px] text-white/30">{String(label)}</span>
                  <span className={`text-[11px] font-semibold capitalize ${String(colorClass)}`}>
                    {String(value).toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Brain Scores */}
          <div className="bg-[#111128] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#C41230]/15 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-[#FF6B7A]" />
              </div>
              <h2 className="text-[12px] font-bold text-white/70">Revenue Brain Scores</h2>
            </div>
            <div className="space-y-3">
              <ScoreBar label="Engagement" value={features?.engagement_score ?? 0} color="#3B82F6" />
              <ScoreBar label="Subscription Propensity" value={features?.subscription_propensity ?? 0} color="#22C55E" />
              <ScoreBar label="Price Sensitivity" value={features?.price_sensitivity ?? 0} color="#F59E0B" />
              <ScoreBar label="Content Loyalty" value={features?.content_loyalty ?? 0} color="#8B5CF6" />
              <ScoreBar label="Churn Risk" value={features?.churn_risk ?? 0} color={features?.churn_risk && features.churn_risk >= 75 ? '#EF4444' : '#22C55E'} />
            </div>
          </div>

          {/* Estimated LTV */}
          <div className="bg-gradient-to-br from-[#C41230]/10 to-[#C41230]/5 border border-[#C41230]/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] text-white/40">Estimated Lifetime Value</span>
            </div>
            <div className="text-[28px] font-black text-white font-mono tracking-tight leading-none mb-1">
              {features?.predicted_ltv ? fmtRp(features.predicted_ltv) : '—'}
            </div>
            <div className="text-[10px] text-white/20">Heuristic estimate · not guaranteed</div>
          </div>
        </div>

        {/* ── Middle Column ───────────────────────────────────── */}
        <div className="space-y-4">

          {/* Behavioral Metrics */}
          <div className="bg-[#111128] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <h2 className="text-[12px] font-bold text-white/70">Behavioral Metrics (30d)</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                [features?.sessions_7d ?? 0, 'Sessions (7d)', <TrendingUp key="s7" className="w-3.5 h-3.5 text-blue-400" />],
                [features?.sessions_30d ?? 0, 'Sessions (30d)', <TrendingUp key="s30" className="w-3.5 h-3.5 text-blue-400" />],
                [features?.articles_7d ?? 0, 'Articles (7d)', <BookOpen key="a7" className="w-3.5 h-3.5 text-emerald-400" />],
                [features?.articles_30d ?? 0, 'Articles (30d)', <BookOpen key="a30" className="w-3.5 h-3.5 text-emerald-400" />],
                [features?.premium_articles_30d ?? 0, 'Premium Articles', <AlertTriangle key="pa" className="w-3.5 h-3.5 text-amber-400" />],
                [`${Math.round(features?.avg_scroll_depth ?? 0)}%`, 'Avg Scroll Depth', <TrendingDown key="sd" className="w-3.5 h-3.5 text-purple-400" />],
                [`${Math.round((features?.avg_completion_rate ?? 0) * 100)}%`, 'Completion Rate', <Activity key="cr" className="w-3.5 h-3.5 text-purple-400" />],
                [features?.paywall_views_30d ?? 0, 'Paywall Views', <AlertTriangle key="pv" className="w-3.5 h-3.5 text-red-400" />],
                [features?.offer_clicks_30d ?? 0, 'Offer Clicks', <MousePointer key="oc" className="w-3.5 h-3.5 text-amber-400" />],
                [features?.checkout_starts_30d ?? 0, 'Checkout Starts', <ShoppingCart key="cs" className="w-3.5 h-3.5 text-[#C41230]" />],
                [features?.days_since_last_visit ?? 0, 'Days Since Visit', <Clock key="ds" className="w-3.5 h-3.5 text-white/40" />],
              ].map(([value, label, icon]) => (
                <div key={String(label)} className="flex items-center gap-2.5 p-2.5 bg-white/[0.03] rounded-xl border border-white/[0.04]">
                  <div className="flex-shrink-0">{icon}</div>
                  <div>
                    <div className="text-[13px] font-mono font-bold text-white/80">{String(value)}</div>
                    <div className="text-[9px] text-white/25">{String(label)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Topic Affinity */}
          <div className="bg-[#111128] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-3.5 h-3.5 text-purple-400" />
              <h2 className="text-[12px] font-bold text-white/70">Content Topic Affinity</h2>
            </div>
            <div className="space-y-3">
              {topics.slice(0, 8).map((topic) => (
                <div key={topic.topic}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-white/50 font-medium">{topic.topic}</span>
                    <span className="text-white/30 font-mono">{Math.round(topic.score)}</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500/80 to-purple-400 rounded-full"
                      style={{ width: `${topic.score}%` }}
                    />
                  </div>
                </div>
              ))}
              {topics.length === 0 && (
                <div className="text-[12px] text-white/20 text-center py-6">No topic data yet</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Column ─────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Latest Decision */}
          {data.latest_decision_explanation && data.decisions?.[0] && (
            <div className="bg-[#111128] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-3.5 h-3.5 text-[#C41230]" />
                <h2 className="text-[12px] font-bold text-white/70">Recommended Action</h2>
              </div>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[12px] font-bold mb-3 ${getDecisionColor(data.decisions[0].selected_action)}`}>
                {ACTION_LABELS[data.decisions[0].selected_action] ?? data.decisions[0].selected_action}
              </span>
              <p className="text-[12px] text-white/40 leading-relaxed mb-3">
                {data.latest_decision_explanation.explanation}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-white/30">
                <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#C41230] to-[#FF6B7A] rounded-full"
                    style={{ width: `${(data.decisions[0].confidence ?? 0) * 100}%` }} />
                </div>
                <span className="font-mono">{Math.round((data.decisions[0].confidence ?? 0) * 100)}% confidence</span>
              </div>
            </div>
          )}

          {/* Reason Codes */}
          {data.decisions?.[0]?.reason_codes && data.decisions[0].reason_codes.length > 0 && (
            <div className="bg-[#111128] border border-white/[0.06] rounded-2xl p-5">
              <h2 className="text-[12px] font-bold text-white/70 mb-3">Decision Factors</h2>
              <div className="flex flex-wrap gap-1.5">
                {data.decisions[0].reason_codes.map((code) => (
                  <span key={code} className="text-[10px] px-2.5 py-1 bg-white/[0.04] text-white/35 border border-white/[0.07] rounded-lg font-mono">
                    {code.replace(/_/g, ' ').toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Score Snapshot */}
          {data.decisions?.[0]?.score_snapshot && Object.keys(data.decisions[0].score_snapshot).length > 0 && (
            <div className="bg-[#111128] border border-white/[0.06] rounded-2xl p-5">
              <h2 className="text-[12px] font-bold text-white/70 mb-3">Score Snapshot at Decision</h2>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(data.decisions[0].score_snapshot).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-white/[0.03] rounded-lg">
                    <span className="text-[10px] text-white/30 capitalize">{key.replace(/_/g,' ')}</span>
                    <span className="text-[12px] font-mono font-bold text-white/60">{typeof val === 'number' ? Math.round(val) : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Event Timeline */}
          <div className="bg-[#111128] border border-white/[0.06] rounded-2xl p-5">
            <h2 className="text-[12px] font-bold text-white/70 mb-4 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Recent Activity
              <span className="ml-auto text-[10px] text-white/20">{data.events.length} events</span>
            </h2>
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
              {data.events.slice(0, 20).map((event) => (
                <div key={event.event_id} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: `${EVENT_COLORS[event.event_name.split('_')[0]] ?? '#6B7280'}15` }}>
                    <div style={{ color: EVENT_COLORS[event.event_name.split('_')[0]] ?? '#6B7280' }}>
                      {EVENT_ICONS[event.event_name] ?? <Activity className="w-3 h-3" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-white/50 capitalize">
                      {event.event_name.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[10px] text-white/20 font-mono">{timeAgo(event.timestamp)}</div>
                  </div>
                </div>
              ))}
              {data.events.length === 0 && (
                <div className="text-[12px] text-white/20 text-center py-6">No events recorded</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
