'use client';

import { useEffect, useState } from 'react';
import { Activity, Search, Filter, ArrowUpRight } from 'lucide-react';

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

function formatRupiah(value: number): string {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}M`;
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

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch('/api/v1/decisions?limit=100')
      .then((r) => r.json())
      .then((d) => { setDecisions(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter
    ? decisions.filter((d) => d.selected_action.includes(filter.toUpperCase()))
    : decisions;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Decision Log</h1>
        <p className="text-sm text-slate-500 mt-1">Full audit trail of every Revenue Brain decision</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'ALLOW_FREE', 'SHOW_REGISTRATION', 'SHOW_MONTHLY', 'SHOW_ANNUAL', 'SHOW_TRIAL', 'NO_ACTION'].map((f) => (
          <button
            key={f || 'all'}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f || 'All Actions'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Time', 'Reader', 'Action', 'Confidence', 'Expected Value', 'Scores', 'Reasons', 'Mode'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-20 bg-slate-100 rounded animate-shimmer" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.map((dec) => {
                const readerId = dec.readers?.external_user_id ?? dec.readers?.anonymous_id ?? dec.reader_id;
                return (
                  <tr key={dec.id} className="border-b border-slate-50 hover:bg-blue-50/30">
                    <td className="px-4 py-3 text-xs text-slate-500">{timeAgo(dec.timestamp)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{readerId?.substring(0, 8)}…</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {dec.selected_action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(dec.confidence ?? 0) * 100}%` }} />
                        </div>
                        <span className="text-xs text-slate-600">{Math.round((dec.confidence ?? 0) * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-700">
                      {dec.expected_value ? formatRupiah(dec.expected_value) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {[
                          ['E', dec.score_snapshot?.engagement_score],
                          ['P', dec.score_snapshot?.subscription_propensity],
                          ['S', dec.score_snapshot?.price_sensitivity],
                          ['C', dec.score_snapshot?.churn_risk],
                        ].map(([label, val]) => (
                          <span key={String(label)} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono" title={String(label)}>
                            {label}:{typeof val === 'number' ? Math.round(val) : '—'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {(dec.reason_codes ?? []).slice(0, 2).map((code) => (
                          <span key={code} className="text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">
                            {code.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        dec.execution_mode === 'LIVE' ? 'bg-emerald-50 text-emerald-700' :
                        dec.execution_mode === 'SHADOW' ? 'bg-amber-50 text-amber-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {dec.execution_mode}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
