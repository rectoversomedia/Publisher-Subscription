'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Newspaper, TrendingUp, Users, Zap, ArrowRight } from 'lucide-react';

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.floor(diff / 60000)}m ago`;
  return `${hours}h ago`;
}

export default function NewsMomentsPage() {
  const [moments, setMoments] = useState<NewsMoment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/news-moments')
      .then((r) => r.json())
      .then((d) => { setMoments(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">News Moment Intelligence</h1>
        <p className="text-sm text-slate-500 mt-1">Traffic anomalies and breaking news monetization opportunities</p>
      </div>

      <div className="grid gap-4">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 h-36 animate-shimmer" />
          ))
        ) : moments.map((moment) => (
          <div key={moment.id} className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  moment.severity === 'HIGH' ? 'bg-red-50' : 'bg-blue-50'
                }`}>
                  {moment.severity === 'HIGH'
                    ? <Zap className="w-5 h-5 text-red-500" />
                    : <TrendingUp className="w-5 h-5 text-blue-500" />}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{moment.topic ?? moment.category ?? 'Breaking News'}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      moment.severity === 'HIGH' ? 'bg-red-50 text-red-700' :
                      moment.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-700' :
                      'bg-slate-50 text-slate-600'
                    }`}>
                      {moment.severity} SEVERITY
                    </span>
                    <span className="text-xs text-slate-400">{timeAgo(moment.detected_at)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-600">
                  +{moment.traffic_lift_percentage.toFixed(0)}%
                </div>
                <div className="text-xs text-slate-500">traffic lift</div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                ['Baseline', moment.baseline_traffic, '/hour'],
                ['Current', moment.current_traffic, '/hour'],
                ['High-Propensity', moment.high_propensity_readers, 'readers'],
                ['Returning', moment.returning_readers, 'readers'],
                ['Est. Revenue', fmt(moment.estimated_incremental_revenue), ''],
              ].map(([label, value, unit]) => (
                <div key={String(label)}>
                  <div className="text-xs text-slate-500">{String(label)}</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {typeof value === 'number' ? fmt(value) : String(value)}{unit}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Recommended: Activate contextual subscription treatment for high-propensity readers in this topic</span>
                <Link
                  href={`/dashboard/news-moments/${moment.id}`}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium"
                >
                  View Details <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ))}

        {!loading && moments.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No active news moments</p>
            <p className="text-sm mt-1">News moments are detected when traffic exceeds 3x the rolling baseline</p>
          </div>
        )}
      </div>
    </div>
  );
}
