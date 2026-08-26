'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Radar, AlertTriangle, Zap, TrendingUp, ArrowRight } from 'lucide-react';

interface Opportunity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  estimated_audience: number;
  estimated_incremental_revenue: number;
  recommended_action: string | null;
  supporting_metrics: Record<string, unknown>;
  detected_at: string;
}

function fmt(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === 'CRITICAL') return <AlertTriangle className="w-5 h-5 text-red-500" />;
  if (severity === 'HIGH') return <Zap className="w-5 h-5 text-amber-500" />;
  if (severity === 'MEDIUM') return <TrendingUp className="w-5 h-5 text-blue-500" />;
  return <Radar className="w-5 h-5 text-slate-400" />;
}

export default function OpportunitiesPage() {
  const [data, setData] = useState<{ data: Opportunity[]; summary: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/opportunities')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const opportunities = data?.data ?? [];
  const summary = data?.summary ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Revenue Opportunity Radar</h1>
        <p className="text-sm text-slate-500 mt-1">Where Tempo is leaving reader revenue on the table</p>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Opportunities', value: summary.total ?? 0, color: 'text-slate-900' },
          { label: 'Critical', value: summary.critical ?? 0, color: 'text-red-600' },
          { label: 'High', value: summary.high ?? 0, color: 'text-amber-600' },
          { label: 'Medium', value: summary.medium ?? 0, color: 'text-blue-600' },
          { label: 'Est. Revenue', value: fmt(summary.total_estimated_revenue ?? 0), color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className={`text-xl font-bold ${color}`}>{String(value)}</div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Opportunity Cards */}
      <div className="space-y-4">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 h-40 animate-shimmer" />
          ))
        ) : opportunities.map((opp) => (
          <div key={opp.id} className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-start gap-4">
              <div className="mt-0.5">
                <SeverityIcon severity={opp.severity} />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">{opp.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        opp.severity === 'CRITICAL' ? 'bg-red-50 text-red-700' :
                        opp.severity === 'HIGH' ? 'bg-amber-50 text-amber-700' :
                        opp.severity === 'MEDIUM' ? 'bg-blue-50 text-blue-700' :
                        'bg-slate-50 text-slate-600'
                      }`}>
                        {opp.severity}
                      </span>
                      <span className="text-xs text-slate-400">{timeAgo(opp.detected_at)}</span>
                      <span className="text-xs text-slate-400 font-mono">{opp.type.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">{fmt(opp.estimated_incremental_revenue)}</div>
                    <div className="text-xs text-slate-500">estimated revenue</div>
                  </div>
                </div>

                {opp.description && (
                  <p className="text-sm text-slate-600 mb-3">{opp.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-slate-500">
                      Audience: <span className="font-medium text-slate-700">{fmt(opp.estimated_audience)}</span>
                    </div>
                    {opp.recommended_action && (
                      <div className="text-slate-500">
                        Action: <span className="font-medium text-blue-700">{opp.recommended_action}</span>
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/opportunities/${opp.id}`}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium"
                  >
                    View Details <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {!loading && opportunities.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <Radar className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No active opportunities</p>
            <p className="text-sm mt-1">Opportunities are detected automatically from reader behavior</p>
          </div>
        )}
      </div>
    </div>
  );
}
