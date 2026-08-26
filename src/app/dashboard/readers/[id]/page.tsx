'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Activity, Target, DollarSign, AlertTriangle, TrendingUp, Clock, FlaskConical, Brain } from 'lucide-react';

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

function ScoreBar({ label, value, max = 100, color = 'blue' }: { label: string; value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const colors: Record<string, string> = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900">{value}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${colors[color] ?? colors.blue} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatRupiah(value: number): string {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
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

export default function ReaderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<{
    reader: Record<string, unknown>;
    decisions: Decision[];
    events: ReaderEvent[];
    experiment_assignments: unknown[];
    latest_decision_explanation: { explanation: string } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/v1/readers/${id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-20 text-center text-slate-500">Loading reader profile...</div>;
  if (!data?.reader) return <div className="py-20 text-center text-slate-500">Reader not found.</div>;

  const reader = data.reader as Record<string, unknown> & {
    features: ReaderFeature | null;
    topic_affinity: TopicAffinity[];
    anonymous_id: string | null;
    external_user_id: string | null;
    subscription_status: string;
    identity_status: string;
    last_seen_at: string;
    created_at: string;
  };
  const features = reader.features;
  const topics = (reader.topic_affinity ?? []).sort((a, b) => b.score - a.score);

  const actionLabels: Record<string, string> = {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/readers" className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reader Profile</h1>
          <p className="text-sm text-slate-500 font-mono">{id?.substring(0, 16)}…</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Summary & Scores */}
        <div className="space-y-6">
          {/* Identity Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <User className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Reader Identity</div>
                <div className="text-xs text-slate-500">
                  {reader.external_user_id ?? reader.anonymous_id ?? id?.substring(0, 12)}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Identity Status</span>
                <span className="font-medium">{String(reader.identity_status ?? '').toLowerCase()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subscription</span>
                <span className={`font-medium ${reader.subscription_status === 'ACTIVE' ? 'text-emerald-600' : reader.subscription_status === 'EXPIRED' ? 'text-red-600' : 'text-slate-600'}`}>
                  {String(reader.subscription_status ?? '').toLowerCase()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Last Seen</span>
                <span className="font-medium">{timeAgo(String(reader.last_seen_at ?? ''))}</span>
              </div>
            </div>
          </div>

          {/* Scores */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-slate-500" />
              <h2 className="font-semibold text-slate-900 text-sm">Revenue Brain Scores</h2>
            </div>
            <div className="space-y-4">
              <ScoreBar label="Engagement" value={features?.engagement_score ?? 0} color="blue" />
              <ScoreBar label="Subscription Propensity" value={features?.subscription_propensity ?? 0} color="emerald" />
              <ScoreBar label="Price Sensitivity" value={features?.price_sensitivity ?? 0} color="amber" />
              <ScoreBar label="Content Loyalty" value={features?.content_loyalty ?? 0} color="purple" />
              <ScoreBar label="Churn Risk" value={features?.churn_risk ?? 0} color="red" />
            </div>
          </div>

          {/* Estimated LTV */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-white/70">Estimated Lifetime Value</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {features?.predicted_ltv ? formatRupiah(features.predicted_ltv) : '—'}
            </div>
            <div className="text-xs text-white/50">Heuristic estimate · not a guaranteed value</div>
          </div>
        </div>

        {/* Middle: Metrics & Topics */}
        <div className="space-y-6">
          {/* Behavioral Metrics */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-4">Behavioral Metrics (30d)</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Sessions (7d)', features?.sessions_7d ?? 0],
                ['Sessions (30d)', features?.sessions_30d ?? 0],
                ['Articles (7d)', features?.articles_7d ?? 0],
                ['Articles (30d)', features?.articles_30d ?? 0],
                ['Premium Articles', features?.premium_articles_30d ?? 0],
                ['Avg Scroll Depth', `${Math.round((features?.avg_scroll_depth ?? 0))}%`],
                ['Completion Rate', `${Math.round((features?.avg_completion_rate ?? 0) * 100)}%`],
                ['Paywall Views', features?.paywall_views_30d ?? 0],
                ['Offer Clicks', features?.offer_clicks_30d ?? 0],
                ['Checkout Starts', features?.checkout_starts_30d ?? 0],
                ['Days Since Visit', features?.days_since_last_visit ?? 0],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex flex-col">
                  <span className="text-xs text-slate-500">{String(label)}</span>
                  <span className="text-sm font-semibold text-slate-900">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Topic Affinity */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-4">Content Topic Affinity</h2>
            <div className="space-y-3">
              {topics.map((topic) => (
                <div key={topic.topic}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 font-medium">{topic.topic}</span>
                    <span className="text-slate-500">{Math.round(topic.score)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                      style={{ width: `${topic.score}%` }}
                    />
                  </div>
                </div>
              ))}
              {topics.length === 0 && (
                <div className="text-sm text-slate-400 text-center py-4">No topic data yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Decision & Journey */}
        <div className="space-y-6">
          {/* Latest Decision */}
          {data.latest_decision_explanation && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-blue-500" />
                <h2 className="font-semibold text-slate-900 text-sm">Recommended Action</h2>
              </div>
              {data.decisions?.[0] && (
                <>
                  <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 font-semibold text-sm mb-3">
                    {actionLabels[data.decisions[0].selected_action] ?? data.decisions[0].selected_action}
                  </div>
                  <div className="text-sm text-slate-600 leading-relaxed mb-3">
                    {data.latest_decision_explanation.explanation}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(data.decisions[0].confidence ?? 0) * 100}%` }} />
                    </div>
                    <span>{Math.round((data.decisions[0].confidence ?? 0) * 100)}% confidence</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Reason Codes */}
          {data.decisions?.[0]?.reason_codes && data.decisions[0].reason_codes.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 text-sm mb-3">Decision Factors</h2>
              <div className="flex flex-wrap gap-1.5">
                {data.decisions[0].reason_codes.map((code) => (
                  <span key={code} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                    {code.replace(/_/g, ' ').toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Event Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {data.events.slice(0, 15).map((event) => (
                <div key={event.event_id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-700">{event.event_name.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-slate-400">{timeAgo(event.timestamp)}</div>
                  </div>
                </div>
              ))}
              {data.events.length === 0 && (
                <div className="text-sm text-slate-400 text-center py-4">No events recorded</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
