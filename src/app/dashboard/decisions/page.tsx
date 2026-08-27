// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { Activity, Search, Filter, ArrowUpRight, Clock, Zap, Target, ChevronDown, ChevronUp } from 'lucide-react';

interface Decision {
  id: string;
  reader_id: string;
  selected_action: string;
  confidence: number;
  reason_codes: string[];
  score_snapshot: Record<string, number>;
  timestamp: string;
  execution_mode: string;
  expected_value: number | null;
  readers?: { anonymous_id?: string; external_user_id?: string };
}

function fmt(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
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

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ALLOW_FREE:         { bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-300' },
  SHOW_REGISTRATION:  { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20' },
  SHOW_MONTHLY:       { bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-200' },
  SHOW_ANNUAL:        { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/20' },
  SHOW_TRIAL:         { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20' },
  SHOW_SAVE_OFFER:    { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/20' },
  SHOW_WINBACK:       { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/20' },
  NO_ACTION:          { bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-300' },
};

const MODE_COLORS: Record<string, { bg: string; text: string }> = {
  LIVE:    { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  SHADOW:  { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  CONTROLLED: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
};

function ExpandedRow({ dec }: { dec: Decision }) {
  const [open, setOpen] = useState(false);
  const readerId = dec.readers?.external_user_id ?? dec.readers?.anonymous_id ?? dec.reader_id;

  return (
    <>
      <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
        onClick={() => setOpen(!open)}>
        <td className="px-4 py-3.5">
          <span className="text-[11px] text-slate-400 font-mono">{timeAgo(dec.timestamp)}</span>
        </td>
        <td className="px-4 py-3.5">
          <code className="text-[10px] font-mono text-slate-300">{readerId?.slice(0, 12)}…</code>
        </td>
        <td className="px-4 py-3.5">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${(ACTION_COLORS[dec.selected_action] ?? ACTION_COLORS.ALLOW_FREE).bg} ${(ACTION_COLORS[dec.selected_action] ?? ACTION_COLORS.ALLOW_FREE).text} ${(ACTION_COLORS[dec.selected_action] ?? ACTION_COLORS.ALLOW_FREE).border}`}>
            {dec.selected_action.replace(/_/g, ' ')}
          </span>
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-500 to-[#FF6B7A] rounded-full"
                style={{ width: `${(dec.confidence ?? 0) * 100}%` }} />
            </div>
            <span className="text-[11px] font-mono text-slate-500">{Math.round((dec.confidence ?? 0) * 100)}%</span>
          </div>
        </td>
        <td className="px-4 py-3.5">
          <span className="text-[12px] font-mono text-slate-400">
            {dec.expected_value ? `Rp ${fmt(dec.expected_value)}` : '—'}
          </span>
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-1.5">
            {[
              ['E', dec.score_snapshot?.engagement_score],
              ['P', dec.score_snapshot?.subscription_propensity],
              ['S', dec.score_snapshot?.price_sensitivity],
              ['C', dec.score_snapshot?.churn_risk],
            ].map(([label, val]) => (
              <span key={String(label)} className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded border border-slate-200">
                {label}:{typeof val === 'number' ? Math.round(val) : '—'}
              </span>
            ))}
          </div>
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-1.5">
            {(dec.reason_codes ?? []).slice(0, 2).map((code) => (
              <span key={code} className="text-[10px] px-2 py-0.5 bg-slate-50 text-slate-300 border border-slate-200 rounded-md">
                {code.replace(/_/g, ' ').toLowerCase()}
              </span>
            ))}
            {(dec.reason_codes ?? []).length > 2 && (
              <span className="text-[10px] text-slate-300">+{dec.reason_codes.length - 2}</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${(MODE_COLORS[dec.execution_mode] ?? MODE_COLORS.SHADOW).bg} ${(MODE_COLORS[dec.execution_mode] ?? MODE_COLORS.SHADOW).text}`}>
            {dec.execution_mode}
          </span>
        </td>
        <td className="px-4 py-3.5">
          <button className="text-slate-300 hover:text-slate-500 transition-colors">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </td>
      </tr>

      {open && (
        <tr className="border-b border-slate-200">
          <td colSpan={9} className="px-6 py-4 bg-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Reason codes full */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-3">All Reason Codes</div>
                <div className="flex flex-wrap gap-1.5">
                  {(dec.reason_codes ?? []).map((code) => (
                    <span key={code} className="text-[10px] px-2.5 py-1 bg-red-50 text-red-500 border border-red-100 rounded-lg font-mono">
                      {code}
                    </span>
                  ))}
                </div>
              </div>
              {/* Score snapshot */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-3">Score Snapshot</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(dec.score_snapshot ?? {}).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-400 capitalize">{key.replace(/_/g,' ')}</span>
                      <span className="text-[12px] font-mono font-bold text-slate-600">{typeof val === 'number' ? Math.round(val) : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Metadata */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-3">Decision Metadata</div>
                <div className="space-y-2">
                  {[
                    ['Decision ID', dec.id.slice(0, 16) + '…'],
                    ['Reader ID', dec.reader_id.slice(0, 16) + '…'],
                    ['Timestamp', new Date(dec.timestamp).toLocaleString()],
                    ['Expected Value', dec.expected_value ? `Rp ${fmt(dec.expected_value)}` : 'None'],
                    ['Execution', dec.execution_mode],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-300">{String(label)}</span>
                      <span className="text-[10px] font-mono text-slate-400">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showExpanded, setShowExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/v1/decisions?limit=100')
      .then((r) => r.json())
      .then((d) => { setDecisions(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter
    ? decisions.filter((d) => d.selected_action.includes(filter.toUpperCase()))
    : decisions;

  const actionCounts: Record<string, number> = {};
  filtered.forEach(d => { actionCounts[d.selected_action] = (actionCounts[d.selected_action] ?? 0) + 1; });

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-400/10 border border-emerald-400/20 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400">LIVE</span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Decisions', value: filtered.length, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Allow Free', value: actionCounts['ALLOW_FREE'] ?? 0, icon: Zap, color: 'text-slate-400', bg: 'bg-slate-50' },
          { label: 'Show Monthly', value: actionCounts['SHOW_MONTHLY'] ?? 0, icon: Target, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Show Annual', value: actionCounts['SHOW_ANNUAL'] ?? 0, icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Avg Confidence', value: filtered.length > 0 ? `${Math.round(filtered.reduce((a, d) => a + (d.confidence ?? 0), 0) / filtered.length * 100)}%` : '—', icon: Target, color: 'text-amber-400', bg: 'bg-amber-500/10' },
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

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {['', 'ALLOW_FREE', 'SHOW_REGISTRATION', 'SHOW_MONTHLY', 'SHOW_ANNUAL', 'NO_ACTION'].map((f) => (
            <button
              key={f || 'all'}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                filter === f
                  ? 'bg-red-100 text-red-500 border border-red-200'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f ? f.replace(/_/g, ' ') : 'All Actions'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200">
                {['Time', 'Reader', 'Action', 'Confidence', 'Expected Value', 'Scores', 'Reasons', 'Mode', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-300">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-200">
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3 bg-slate-50 rounded animate-pulse" style={{ width: `${50 + Math.random() * 50}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <Activity className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-[13px] font-semibold text-slate-400">No decisions found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((dec) => <ExpandedRow key={dec.id} dec={dec} />)
              )}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-100">
            <span className="text-[11px] text-slate-300">Showing {filtered.length} most recent decisions</span>
          </div>
        )}
      </div>
    </div>
  );
}
