// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, TrendingUp, Zap, Users, Newspaper } from 'lucide-react';

interface NewsMoment {
  id: string;
  topic: string | null;
  category: string | null;
  article_id: string;
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

export default function NewsMomentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [moment, setMoment] = useState<NewsMoment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch('/api/news-moments')
      .then((r) => r.json())
      .then((d) => {
        const found = (d.data ?? []).find((m: NewsMoment) => m.id === id);
        if (found) setMoment(found);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-20 text-center text-white/30">Loading moment…</div>;
  if (!moment) return <div className="py-20 text-center text-white/30">News moment not found</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/news-moments" className="p-2 border border-white/[0.08] rounded-xl hover:bg-[#111128]/[0.05]">
          <ArrowLeft className="w-4 h-4 text-white/50" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white/80">{moment.topic ?? moment.category ?? 'Breaking News'}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              moment.severity === 'HIGH' ? 'bg-red-500/10 text-red-400' :
              moment.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' :
              'bg-white/[0.04] text-white/30'
            }`}>
              {moment.severity}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-white/30">
            <span>Detected {timeAgo(moment.detected_at)}</span>
            {moment.category && <span>· {moment.category}</span>}
          </div>
        </div>
      </div>

      {/* Traffic Lift Hero */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-8 text-white text-center">
        <div className="text-5xl font-bold">+{moment.traffic_lift_percentage.toFixed(0)}%</div>
        <div className="text-white/70 text-sm mt-2">Traffic lift vs rolling baseline</div>
      </div>

      {/* Traffic Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111128] border border-white/[0.06] rounded-xl p-5 text-center">
          <div className="text-2xl font-bold text-white/80">{moment.baseline_traffic}/h</div>
          <div className="text-xs text-white/40 mt-1">Baseline traffic (avg/hour)</div>
        </div>
        <div className="bg-[#111128] border border-white/[0.06] rounded-xl p-5 text-center">
          <div className="text-2xl font-bold text-white/80">{moment.current_traffic}</div>
          <div className="text-xs text-white/40 mt-1">Current traffic (last hour)</div>
        </div>
        <div className="bg-[#111128] border border-white/[0.06] rounded-xl p-5 text-center">
          <div className="text-2xl font-bold text-white/80">{moment.new_readers}</div>
          <div className="text-xs text-white/40 mt-1">New readers</div>
        </div>
        <div className="bg-[#111128] border border-white/[0.06] rounded-xl p-5 text-center">
          <div className="text-2xl font-bold text-white/80">{moment.returning_readers}</div>
          <div className="text-xs text-white/40 mt-1">Returning readers</div>
        </div>
      </div>

      {/* Revenue Opportunity */}
      <div className="bg-[#111128] border border-white/[0.06] rounded-xl p-6">
        <h2 className="font-semibold text-white/80 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Monetization Opportunity
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs text-white/40 mb-1">Estimated Incremental Revenue</div>
            <div className="text-3xl font-bold text-emerald-400">{fmt(moment.estimated_incremental_revenue)}</div>
          </div>
          <div>
            <div className="text-xs text-white/40 mb-1">High-Propensity Readers in Topic</div>
            <div className="text-3xl font-bold text-blue-400">{fmt(moment.high_propensity_readers)}</div>
            <Link
              href={`/dashboard/readers?topic=${encodeURIComponent(moment.topic ?? '')}`}
              className="text-xs text-blue-400 hover:underline mt-1 inline-block"
            >
              View audience →
            </Link>
          </div>
        </div>
      </div>

      {/* Recommended Treatment */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
        <div className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-2">Revenue Brain Recommendation</div>
        <p className="text-sm text-white/70">
          Activate contextual subscription treatment for high-propensity readers consuming {moment.topic ?? 'this topic'}.
          Current traffic surge presents a prime opportunity to convert engaged readers into subscribers.
        </p>
        <div className="mt-3 flex gap-2">
          <Link
            href={`/dashboard/readers?propensity=60`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C41230] text-white text-xs rounded-lg hover:bg-[#A30F26]"
          >
            <Users className="w-3.5 h-3.5" />
            View High-Propensity Audience
          </Link>
          <Link
            href="/dashboard/experiments"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-white/70 border border-white/10 text-xs rounded-lg hover:bg-white/15"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Create Experiment
          </Link>
        </div>
      </div>
    </div>
  );
}
