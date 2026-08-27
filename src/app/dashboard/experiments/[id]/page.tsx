// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, FlaskConical, Play, Pause, CheckCircle, Users, ChevronRight, TrendingUp } from 'lucide-react';

interface ExperimentVariant {
  id: string;
  name: string;
  allocation_percentage: number;
  action: string | null;
  offer_id: string | null;
}

interface ExperimentResult {
  variant_id: string;
  exposures: number;
  conversions: number;
  conversion_rate: number;
  revenue: number;
  revenue_per_exposed: number;
  lift_vs_control?: number;
  is_significant?: boolean;
}

interface Experiment {
  id: string;
  name: string;
  hypothesis: string | null;
  description?: string;
  status: string;
  primary_metric: string;
  guardrail_metrics: string[];
  audience_definition: Record<string, unknown>;
  traffic_percentage: number;
  start_at: string | null;
  created_at: string;
  experiment_variants?: ExperimentVariant[];
  results?: ExperimentResult[];
}

function fmt(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtPct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ExperimentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchExperiment = () => {
    fetch(`/api/v1/experiments/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); }
        else { setExperiment(d.experiment); }
        setLoading(false);
      })
      .catch(() => { setError('Failed to load'); setLoading(false); });
  };

  useEffect(() => { if (id) fetchExperiment(); }, [id]);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/v1/experiments?id=${id}&action=${action}`, { method: 'PATCH' });
      if (res.ok) fetchExperiment();
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Loading experiment…</div>;
  if (error || !experiment) return <div className="py-20 text-center text-slate-400">{error ?? 'Experiment not found'}</div>;

  const variants = experiment.experiment_variants ?? [];
  const results = experiment.results ?? [];
  const controlVariant = variants[0];

  const statusColors: Record<string, string> = {
    RUNNING: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    PAUSED: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    DRAFT: 'bg-slate-50 text-slate-400 border-slate-300',
    COMPLETED: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/experiments" className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50">
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">{experiment.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[experiment.status] ?? statusColors.DRAFT}`}>
                {experiment.status}
              </span>
            </div>
            {experiment.hypothesis && (
              <p className="text-sm text-slate-400 mt-1">{experiment.hypothesis}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {experiment.status === 'RUNNING' && (
            <button
              onClick={() => handleAction('pause')}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/15 disabled:opacity-50"
            >
              <Pause className="w-4 h-4" />
              {actionLoading === 'pause' ? 'Pausing…' : 'Pause'}
            </button>
          )}
          {experiment.status === 'PAUSED' && (
            <button
              onClick={() => handleAction('start')}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/15 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {actionLoading === 'start' ? 'Starting…' : 'Resume'}
            </button>
          )}
          {experiment.status === 'DRAFT' && (
            <button
              onClick={() => handleAction('start')}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-900 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {actionLoading === 'start' ? 'Starting…' : 'Start Experiment'}
            </button>
          )}
          {(experiment.status === 'RUNNING' || experiment.status === 'PAUSED') && (
            <button
              onClick={() => handleAction('complete')}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-500 border border-slate-300 rounded-xl hover:border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {actionLoading === 'complete' ? 'Completing…' : 'Complete'}
            </button>
          )}
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Primary Metric</div>
          <div className="text-sm font-semibold text-slate-800 capitalize">{experiment.primary_metric.replace(/_/g, ' ')}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Traffic</div>
          <div className="text-sm font-semibold text-slate-800">{experiment.traffic_percentage}%</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Variants</div>
          <div className="text-sm font-semibold text-slate-800">{variants.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Created</div>
          <div className="text-sm font-semibold text-slate-800">{timeAgo(experiment.created_at)}</div>
        </div>
      </div>

      {/* Variants */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Variants</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {variants.map((v) => {
            const variantResult = results.find((r) => r.variant_id === v.id);
            const lift = variantResult && controlVariant && controlVariant.id !== v.id && variantResult.lift_vs_control != null
              ? variantResult.lift_vs_control
              : null;
            return (
              <div key={v.id} className="border border-slate-300 rounded-xl p-4 bg-slate-50">
                <div className="font-medium text-slate-800 text-sm">{v.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{v.allocation_percentage}% traffic</div>
                {v.action && (
                  <div className="text-xs text-blue-600 mt-1">{v.action}</div>
                )}
                {variantResult && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Exposures</span>
                      <span className="font-medium">{fmt(variantResult.exposures)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Conv. Rate</span>
                      <span className="font-medium">{fmtPct(variantResult.conversion_rate)}</span>
                    </div>
                    {variantResult.revenue > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Revenue</span>
                        <span className="font-medium">{fmt(variantResult.revenue)}</span>
                      </div>
                    )}
                    {lift !== null && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">vs Control</span>
                        <span className={`font-medium ${lift > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {lift > 0 ? '+' : ''}{(lift * 100).toFixed(1)}%
                          {variantResult.is_significant && ' ✓'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {!variants.length && (
            <div className="col-span-3 text-sm text-slate-400 text-center py-6">No variants configured</div>
          )}
        </div>
      </div>

      {/* Audience */}
      {experiment.audience_definition && Object.keys(experiment.audience_definition).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Target Audience
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(experiment.audience_definition).map(([key, val]) => (
              <span key={key} className="inline-flex items-center px-3 py-1 bg-blue-500/15 text-blue-400 rounded-full text-xs">
                {key}: {String(val)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
