// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { FileText, TrendingUp, DollarSign, Target, ArrowUpRight, BookOpen } from 'lucide-react';

interface ContentMetric {
  article_id: string;
  pageviews: number;
  unique_readers: number;
  subscriber_readers: number;
  direct_subscriptions: number;
  assisted_subscriptions: number;
  revenue: number;
  estimated_ltv_generated: number;
  classification: string;
  articles?: { title: string; topic: string; category: string };
}

function fmt(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtRp(value: number): string {
  return `Rp ${value.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
}

const CLASS_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  CONVERSION_CONTENT:   { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  TRAFFIC_CONTENT:      { bg: 'bg-white/[0.04]', text: 'text-white/30', border: 'border-white/[0.07]' },
  RETENTION_CONTENT:    { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20' },
  BALANCED_CONTENT:    { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/20' },
};

export default function ContentPage() {
  const [metrics, setMetrics] = useState<ContentMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'pageviews' | 'revenue' | 'direct_subscriptions'>('revenue');

  useEffect(() => {
    fetch('/api/content-metrics?limit=50')
      .then((r) => r.json())
      .then((d) => { setMetrics(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sorted = [...metrics].sort((a, b) => {
    if (sortBy === 'revenue') return b.revenue - a.revenue;
    if (sortBy === 'pageviews') return b.pageviews - a.pageviews;
    return b.direct_subscriptions - a.direct_subscriptions;
  });

  const totalRevenue = metrics.reduce((a, m) => a + m.revenue, 0);
  const totalConversions = metrics.reduce((a, m) => a + m.direct_subscriptions, 0);
  const totalPageviews = metrics.reduce((a, m) => a + m.pageviews, 0);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-[22px] font-black text-white tracking-tight leading-none">Content Revenue Intelligence</h1>
        <p className="text-[11px] text-white/30 mt-2 flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-[#C41230]/50" />
          Article-level revenue attribution and content performance
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue', value: totalRevenue ? fmtRp(totalRevenue) : '—', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Direct Subscriptions', value: totalConversions, icon: Target, color: 'text-[#FF6B7A]', bg: 'bg-[#C41230]/10' },
          { label: 'Total Pageviews', value: fmt(totalPageviews), icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Avg per Article', value: metrics.length > 0 ? fmtRp(Math.round(totalRevenue / metrics.length)) : '—', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-[#111128] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.1] transition-all">
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-[18px] font-black text-white font-mono leading-none mb-1">{stat.value}</div>
              <div className="text-[10px] text-white/30">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Classification Legend */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-white/20 uppercase tracking-widest mr-1">Legend:</span>
        {Object.entries(CLASS_CONFIG).map(([cls, cfg]) => (
          <span key={cls} className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            {cls.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-white/30">Sort by:</span>
        {([
          ['revenue', 'Revenue'],
          ['pageviews', 'Pageviews'],
          ['direct_subscriptions', 'Conversions'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
              sortBy === key
                ? 'bg-[#C41230]/20 text-[#FF6B7A] border border-[#C41230]/25'
                : 'text-white/30 hover:text-white/60 bg-white/[0.04] border border-white/[0.06]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#111128] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Article', 'Topic', 'Pageviews', 'Subscribers', 'Direct Subs', 'Revenue', 'Est. LTV', 'Classification', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[9px] font-bold uppercase tracking-[0.12em] text-white/20">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3 bg-white/[0.04] rounded animate-pulse" style={{ width: `${50 + Math.random() * 50}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <FileText className="w-10 h-10 text-white/10 mx-auto mb-3" />
                    <p className="text-[13px] font-semibold text-white/30">No content metrics yet</p>
                  </td>
                </tr>
              ) : (
                sorted.map((m, idx) => {
                  const cls = CLASS_CONFIG[m.classification] ?? CLASS_CONFIG.TRAFFIC_CONTENT;
                  const hasRevenue = m.revenue > 0;
                  return (
                    <tr key={m.article_id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-white/15 w-5 flex-shrink-0">#{idx + 1}</span>
                          <div className="min-w-0">
                            <div className="text-[12px] font-semibold text-white/60 truncate">{m.articles?.title ?? m.article_id.slice(0, 20) + '…'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[11px] text-white/30">{m.articles?.topic ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-mono text-white/60">{fmt(m.pageviews)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-mono text-white/40">{fmt(m.subscriber_readers)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-mono font-bold text-emerald-400">{m.direct_subscriptions}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[12px] font-mono font-bold ${hasRevenue ? 'text-white/70' : 'text-white/20'}`}>
                          {hasRevenue ? fmtRp(m.revenue) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-mono text-white/30">{fmt(m.estimated_ltv_generated)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border ${cls.bg} ${cls.text} ${cls.border}`}>
                          {m.classification?.replace(/_/g, ' ') ?? 'TRAFFIC'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <ArrowUpRight className="w-3.5 h-3.5 text-white/15" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
