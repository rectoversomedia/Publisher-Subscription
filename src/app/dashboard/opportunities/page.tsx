// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { Radar, AlertTriangle, Zap, TrendingUp, ArrowRight, Clock, Target, TrendingDown } from 'lucide-react';

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

function fmtRp(value: number): string {
  return `Rp ${value.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  CRITICAL: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', icon: <AlertTriangle className="w-5 h-5 text-red-400" /> },
  HIGH:     { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: <Zap className="w-5 h-5 text-amber-400" /> },
  MEDIUM:   { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: <TrendingUp className="w-5 h-5 text-blue-400" /> },
  LOW:      { bg: 'bg-white/[0.04]', text: 'text-white/30', border: 'border-white/[0.07]', icon: <Radar className="w-5 h-5 text-white/30" /> },
};

export default function OpportunitiesPage() {
  const [data, setData] = useState<{ data: Opportunity[]; summary: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/opportunities')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const opportunities = data?.data ?? [];
  const summary = data?.summary ?? {};

  const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-black text-white tracking-tight leading-none">Revenue Opportunity Radar</h1>
          <p className="text-[11px] text-white/30 mt-2 flex items-center gap-2">
            <Radar className="w-3.5 h-3.5 text-[#C41230]/50" />
            Where Revenue Intelligence is leaving money on the table
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Opportunities', value: fmt(summary.total ?? 0), icon: Radar, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Critical', value: summary.critical ?? 0, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'High', value: summary.high ?? 0, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Medium', value: summary.medium ?? 0, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Est. Revenue', value: summary.total_estimated_revenue ? fmtRp(summary.total_estimated_revenue) : '—', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-[#111128] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.1] transition-all">
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-[20px] font-black text-white font-mono leading-none mb-1">{stat.value}</div>
              <div className="text-[10px] text-white/30">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Opportunity List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-[#111128] border border-white/[0.06] rounded-2xl p-6">
              <div className="h-20 bg-white/[0.04] rounded-xl animate-pulse" />
            </div>
          ))
        ) : opportunities.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-[#111128] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <Radar className="w-7 h-7 text-white/20" />
            </div>
            <p className="text-[13px] font-semibold text-white/30">No active opportunities</p>
            <p className="text-[11px] text-white/15 mt-1">Opportunities are detected automatically from reader behavior</p>
          </div>
        ) : (
          opportunities
            .sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity))
            .map((opp) => {
              const cfg = SEVERITY_CONFIG[opp.severity] ?? SEVERITY_CONFIG.LOW;
              const isExpanded = expanded === opp.id;

              return (
                <div key={opp.id} className={`bg-[#111128] border rounded-2xl overflow-hidden transition-all ${isExpanded ? 'border-white/[0.1]' : 'border-white/[0.06]'}`}>
                  <div
                    className="p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : opp.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Severity icon */}
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
                        {cfg.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                              <h3 className="text-[14px] font-bold text-white/90">{opp.title}</h3>
                              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                                {opp.severity}
                              </span>
                              <span className="text-[10px] text-white/20 font-mono">{opp.type.replace(/_/g, ' ')}</span>
                            </div>
                            {opp.description && (
                              <p className="text-[12px] text-white/35 leading-relaxed">{opp.description}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[16px] font-black text-white font-mono">{fmtRp(opp.estimated_incremental_revenue)}</div>
                            <div className="text-[10px] text-white/25">est. revenue</div>
                          </div>
                        </div>

                        {/* Bottom row */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-4">
                            <span className="text-[11px] text-white/30 flex items-center gap-1.5">
                              <Target className="w-3 h-3" />
                              Audience: <span className="font-semibold text-white/50">{fmt(opp.estimated_audience)}</span>
                            </span>
                            {opp.recommended_action && (
                              <span className="text-[11px] text-white/25 flex items-center gap-1.5">
                                <Zap className="w-3 h-3" />
                                {opp.recommended_action}
                              </span>
                            )}
                            <span className="text-[11px] text-white/20 flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              {timeAgo(opp.detected_at)}
                            </span>
                          </div>
                          <span className="text-[11px] text-white/30">
                            {isExpanded ? 'Click to collapse' : 'Click to expand'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-white/[0.05] bg-[#0D0D1F]/40 pt-4">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {Object.entries(opp.supporting_metrics ?? {}).map(([key, val]) => (
                          <div key={key} className="bg-[#111128] border border-white/[0.06] rounded-xl p-3">
                            <div className="text-[10px] text-white/25 capitalize mb-1">{key.replace(/_/g,' ')}</div>
                            <div className="text-[15px] font-bold text-white/70 font-mono">
                              {typeof val === 'number' ? fmt(Number(val)) : String(val)}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <a
                          href={`/dashboard/opportunities/${opp.id}`}
                          className="flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-white bg-[#C41230]/15 border border-[#C41230]/25 rounded-xl hover:bg-[#C41230]/25 transition-all"
                        >
                          View Full Details <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
