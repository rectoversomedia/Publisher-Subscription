'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Activity, Brain, Clock, User, FlaskConical, ChevronRight } from 'lucide-react';

interface DecisionDetail {
  id: string;
  reader_id: string;
  timestamp: string;
  selected_action: string;
  confidence: number;
  reason_codes: string[];
  score_snapshot: Record<string, number>;
  execution_mode: string;
  experiment_id: string | null;
  selected_offer_id: string | null;
  decision_version: string;
  expected_value: number | null;
  latency_ms: number | null;
  readers?: {
    anonymous_id?: string;
    external_user_id?: string;
    subscription_status: string;
    identity_status: string;
  };
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

function fmt(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  ALLOW_FREE: { label: 'Free Access', color: 'bg-slate-100 text-slate-700' },
  SHOW_REGISTRATION: { label: 'Registration Wall', color: 'bg-blue-50 text-blue-700' },
  SHOW_NEWSLETTER_GATE: { label: 'Newsletter Gate', color: 'bg-purple-50 text-purple-700' },
  SHOW_MONTHLY: { label: 'Monthly Subscription', color: 'bg-emerald-50 text-emerald-700' },
  SHOW_ANNUAL: { label: 'Annual Subscription', color: 'bg-emerald-100 text-emerald-800' },
  SHOW_TRIAL: { label: 'Free Trial', color: 'bg-amber-50 text-amber-700' },
  SHOW_SAVE_OFFER: { label: 'Save Offer', color: 'bg-red-50 text-red-700' },
  SHOW_WINBACK: { label: 'Winback Offer', color: 'bg-orange-50 text-orange-700' },
  NO_ACTION: { label: 'No Action', color: 'bg-slate-50 text-slate-500' },
};

const REASON_LABELS: Record<string, string> = {
  HIGH_PROPENSITY: 'High subscription propensity',
  MEDIUM_PROPENSITY: 'Medium subscription propensity',
  LOW_PROPENSITY: 'Low subscription propensity',
  NEW_READER: 'New reader — no history',
  RETURNING_READER: 'Returning reader',
  ACTIVE_SUBSCRIBER: 'Active subscriber',
  HIGH_CHURN_RISK: 'High churn risk signals',
  LOW_CHURN_RISK: 'Low churn risk',
  INVESTIGATIVE_CONTENT: 'Consuming investigative journalism',
  LOW_PRICE_SENSITIVITY: 'Low price sensitivity',
  HIGH_PRICE_SENSITIVITY: 'High price sensitivity',
  HIGH_ENGAGEMENT: 'High engagement signals',
  LOW_ENGAGEMENT_7D: 'Low engagement (7 days)',
  HIGH_CONTENT_LOYALTY: 'High content loyalty',
  REGISTERED_READER: 'Registered reader',
  ANONYMOUS_READER: 'Anonymous reader',
  FORMER_SUBSCRIBER: 'Former subscriber',
  RE_ENGAGEMENT: 'Re-engagement candidate',
  WINBACK_CANDIDATE: 'Winback candidate',
};

export default function DecisionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [decision, setDecision] = useState<DecisionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/v1/decisions?limit=200`)
      .then((r) => r.json())
      .then((d) => {
        const found = (d.data ?? []).find((dec: DecisionDetail) => dec.id === id);
        if (found) setDecision(found);
        else setError('Decision not found');
        setLoading(false);
      })
      .catch(() => { setError('Failed to load'); setLoading(false); });
  }, [id]);

  if (loading) return <div className="py-20 text-center text-slate-400">Loading decision…</div>;
  if (error || !decision) return <div className="py-20 text-center text-slate-400">{error ?? 'Decision not found'}</div>;

  const action = ACTION_LABELS[decision.selected_action] ?? { label: decision.selected_action, color: 'bg-slate-100 text-slate-700' };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/decisions" className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Decision Detail</h1>
          <p className="text-xs text-slate-400 font-mono">{id}</p>
        </div>
      </div>

      {/* Decision Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-slate-500" />
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${action.color}`}>
              {action.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            {timeAgo(decision.timestamp)}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">Confidence</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(decision.confidence ?? 0) * 100}%` }}
                />
              </div>
              <span className="text-sm font-semibold">{Math.round((decision.confidence ?? 0) * 100)}%</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Execution Mode</div>
            <span className={`text-sm font-medium ${decision.execution_mode === 'LIVE' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {decision.execution_mode}
            </span>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Decision Version</div>
            <span className="text-sm font-medium text-slate-700">{decision.decision_version ?? '—'}</span>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Expected Value</div>
            <span className="text-sm font-medium text-slate-700">
              {decision.expected_value != null ? fmt(decision.expected_value) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Reason Codes */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Reason Codes
        </h2>
        <div className="flex flex-wrap gap-2">
          {(decision.reason_codes ?? []).map((code) => (
            <span key={code} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              {REASON_LABELS[code] ?? code.replace(/_/g, ' ').toLowerCase()}
            </span>
          ))}
          {(!decision.reason_codes || decision.reason_codes.length === 0) && (
            <span className="text-xs text-slate-400">No reason codes recorded</span>
          )}
        </div>
      </div>

      {/* Score Snapshot */}
      {decision.score_snapshot && Object.keys(decision.score_snapshot).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Score Snapshot at Decision Time</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(decision.score_snapshot).map(([key, value]) => (
              <div key={key} className="text-center">
                <div className="text-2xl font-bold text-slate-900">{typeof value === 'number' ? Math.round(value) : value}</div>
                <div className="text-xs text-slate-500 mt-1 capitalize">{key.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reader & Experiment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Reader */}
        {decision.readers && (
          <Link href={`/dashboard/readers/${decision.reader_id}`} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-200 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <h3 className="font-semibold text-slate-900 text-sm">Reader</h3>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Identity</span>
                <span className="font-medium text-slate-700">{decision.readers.identity_status?.toLowerCase()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Subscription</span>
                <span className="font-medium text-slate-700">{decision.readers.subscription_status?.toLowerCase()}</span>
              </div>
              {decision.readers.external_user_id && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">External ID</span>
                  <span className="font-medium text-slate-700 font-mono text-xs">{String(decision.readers.external_user_id).substring(0, 12)}…</span>
                </div>
              )}
            </div>
          </Link>
        )}

        {/* Experiment */}
        {decision.experiment_id && (
          <Link href={`/dashboard/experiments/${decision.experiment_id}`} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-200 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-slate-400" />
                <h3 className="font-semibold text-slate-900 text-sm">Experiment Assignment</h3>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-xs text-slate-500 font-mono">{decision.experiment_id.substring(0, 16)}…</div>
          </Link>
        )}

        {/* Technical Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-3">Technical Details</h3>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Decision ID</span>
              <span className="font-mono text-slate-600">{decision.id.substring(0, 8)}…</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Reader ID</span>
              <span className="font-mono text-slate-600">{decision.reader_id.substring(0, 8)}…</span>
            </div>
            {decision.latency_ms != null && (
              <div className="flex justify-between">
                <span className="text-slate-500">Latency</span>
                <span className="font-medium text-slate-700">{decision.latency_ms}ms</span>
              </div>
            )}
            {decision.selected_offer_id && (
              <div className="flex justify-between">
                <span className="text-slate-500">Offer ID</span>
                <span className="font-mono text-slate-600">{String(decision.selected_offer_id).substring(0, 8)}…</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
