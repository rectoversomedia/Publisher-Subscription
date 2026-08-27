// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Newspaper, TrendingUp, Users, Zap, ArrowRight, TrendingDown, Clock, BarChart3, Target, DollarSign } from 'lucide-react';

interface NewsMoment {
  id: string;
  topic: string | null;
  category: string | null;
  baseline_traffic: number;
  current_traffic: number;
  traffic_lift_percentage: number;
  new_readers: number;
  returning_readers: number;
  high_propensity_readers: number;
  estimated_incremental_revenue: number;
  severity: string;
  status: string;
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
  return `${hours}h ago`;
}

const SEV_CONFIG: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; bar: string }> = {
  CRITICAL: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', icon: <Zap className="w-5 h-5" />, bar: 'bg-red-500' },
  HIGH:     { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: <TrendingUp className="w-5 h-5" />, bar: 'bg-amber-500' },
  MEDIUM:   { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: <TrendingUp className="w-5 h-5" />, bar: 'bg-blue-500' },
  LOW:      { bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-300', icon: <Newspaper className="w-5 h-5" />, bar: 'bg-white/20' },
};

export default function NewsMomentsPage() {
  const [moments, setMoments] = useState<NewsMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/news-moments')
      .then((r) => r.json())
      .then((d) => { setMoments(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalRevenue = moments.reduce((a, m) => a + m.estimated_incremental_revenue, 0);
  const totalLift = moments.reduce((a, m) => a + m.traffic_lift_percentage, 0) / (moments.length || 1);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight leading-none">News Moment Intelligence</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Active Moments', value: moments.length, icon: Newspaper, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Avg Traffic Lift', value: moments.length > 0 ? `+${Math.round(totalLift)}%` : '—', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'High-Intent Readers', value: fmt(moments.reduce((a, m) => a + m.high_propensity_readers, 0)), icon: Target, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Est. Incremental Revenue', value: totalRevenue > 0 ? fmtRp(totalRevenue) : '—', icon: DollarSign, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all">
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-[18px] font-black text-slate-900 font-mono leading-none mb-1">{stat.value}</div>
              <div className="text-[10px] text-slate-400">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Moments List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="h-24 bg-slate-50 rounded-xl animate-pulse" />
            </div>
          ))
        ) : moments.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-4">
              <Newspaper className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-[13px] font-semibold text-slate-400">No active news moments</p>
            <p className="text-[11px] text-slate-300 mt-1">Moments detected when traffic exceeds 3× rolling baseline</p>
          </div>
        ) : (
          moments.map((moment) => {
            const cfg = SEV_CONFIG[moment.severity] ?? SEV_CONFIG.LOW;
            const isExpanded = expanded === moment.id;
            const lift = moment.traffic_lift_percentage;

            return (
              <div key={moment.id} className={`bg-white border rounded-2xl overflow-hidden transition-all ${isExpanded ? 'border-slate-200' : 'border-slate-200'}`}>
                {/* Lift bar at top */}
                <div className="h-1 w-full bg-slate-50">
                  <div className={`h-full ${cfg.bar} opacity-60 transition-all`} style={{ width: `${Math.min(100, lift)}%` }} />
                </div>

                <div
                  className="p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : moment.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Severity icon */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
                      <div className={cfg.text}>{cfg.icon}</div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                            <h3 className="text-[14px] font-bold text-slate-900">
                              {moment.topic ?? moment.category ?? 'Breaking News'}
                            </h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                              {moment.severity} SEVERITY
                            </span>
                            {moment.category && (
                              <span className="text-[10px] text-slate-300">{moment.category}</span>
                            )}
                          </div>
                        </div>

                        {/* Lift badge */}
                        <div className="flex-shrink-0 text-right">
                          <div className="text-[24px] font-black text-slate-900 font-mono leading-none">
                            +{lift.toFixed(0)}%
                          </div>
                          <div className="text-[10px] text-slate-300">traffic lift</div>
                        </div>
                      </div>

                      {/* Metrics row */}
                      <div className="flex items-center gap-6 mt-3 flex-wrap">
                        {[
                          [moment.baseline_traffic, 'Baseline', '/hr'],
                          [moment.current_traffic, 'Current', '/hr'],
                          [moment.high_propensity_readers, 'High-Intent', 'readers'],
                          [moment.returning_readers, 'Returning', 'readers'],
                          [moment.new_readers, 'New', 'readers'],
                        ].map(([val, label, unit]) => (
                          <div key={String(label)} className="text-center">
                            <div className="text-[13px] font-mono font-bold text-slate-600">{fmt(Number(val))}{unit}</div>
                            <div className="text-[9px] text-slate-300">{label}</div>
                          </div>
                        ))}
                        <div className="text-center">
                          <div className="text-[13px] font-mono font-bold text-emerald-400">{fmtRp(moment.estimated_incremental_revenue)}</div>
                          <div className="text-[9px] text-slate-300">Est. Revenue</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-200 bg-white/40 pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-[12px] text-slate-400 leading-relaxed">
                          Recommended: Activate contextual subscription treatment for high-propensity readers in this topic. Breaking news readers show elevated conversion intent — offer Tempo+ with urgency framing.
                        </p>
                      </div>
                      <Link
                        href={`/dashboard/news-moments/${moment.id}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-slate-900 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-all flex-shrink-0"
                      >
                        View Details <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
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
