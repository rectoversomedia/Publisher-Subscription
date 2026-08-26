'use client';

import { useEffect, useState } from 'react';
import { FileText, TrendingUp, DollarSign, Target } from 'lucide-react';

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

function formatRupiah(value: number): string {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(2)}M`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('id-ID');
}

const classificationColors: Record<string, string> = {
  CONVERSION_CONTENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  TRAFFIC_CONTENT: 'bg-slate-50 text-slate-600 border-slate-200',
  RETENTION_CONTENT: 'bg-blue-50 text-blue-700 border-blue-200',
  BALANCED_CONTENT: 'bg-purple-50 text-purple-700 border-purple-200',
};

export default function ContentPage() {
  const [metrics, setMetrics] = useState<ContentMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/content-metrics?limit=50')
      .then((r) => r.json())
      .then((d) => { setMetrics(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Content Revenue Intelligence</h1>
        <p className="text-sm text-slate-500 mt-1">Article-level revenue attribution and content performance</p>
      </div>

      {/* Classification Legend */}
      <div className="flex items-center gap-4 text-xs">
        {Object.entries(classificationColors).map(([cls, color]) => (
          <span key={cls} className={`px-2 py-1 rounded-full border font-medium ${color}`}>
            {cls.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Article', 'Topic', 'Pageviews', 'Subscribers', 'Direct Subs', 'Revenue', 'Est. LTV', 'Classification'].map((h) => (
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
              ) : metrics.map((m) => (
                <tr key={m.article_id} className="border-b border-slate-50 hover:bg-blue-50/30">
                  <td className="px-4 py-3 max-w-xs">
                    <div className="text-sm font-medium text-slate-800 truncate">{m.articles?.title ?? m.article_id.substring(0, 16)}…</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{m.articles?.topic ?? '—'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-700">{formatNumber(m.pageviews)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{formatNumber(m.subscriber_readers)}</td>
                  <td className="px-4 py-3 text-sm text-emerald-700 font-medium">{m.direct_subscriptions}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{formatRupiah(m.revenue)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{formatRupiah(m.estimated_ltv_generated)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${classificationColors[m.classification] ?? classificationColors.TRAFFIC_CONTENT}`}>
                      {m.classification?.replace(/_/g, ' ') ?? 'TRAFFIC'}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && metrics.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400">No content metrics yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
