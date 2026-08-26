'use client';

import { useEffect, useState } from 'react';
import { FlaskConical, Play, Pause, Plus, TrendingUp, Users, Target, ArrowUpRight } from 'lucide-react';

interface Experiment {
  id: string;
  name: string;
  hypothesis: string | null;
  status: string;
  primary_metric: string;
  traffic_percentage: number;
  start_at: string | null;
  created_at: string;
  experiment_variants?: ExperimentVariant[];
  results?: ExperimentResult[];
}

interface ExperimentVariant {
  id: string;
  name: string;
  allocation_percentage: number;
  action: string | null;
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

function formatRupiah(value: number): string {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}M`;
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExperiments = async () => {
    const res = await fetch('/api/v1/experiments?include_variants=true');
    const json = await res.json();
    setExperiments(json.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchExperiments(); }, []);

  const handleAction = async (id: string, action: string) => {
    await fetch(`/api/v1/experiments?id=${id}&action=${action}`, { method: 'PATCH' });
    fetchExperiments();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Experiments</h1>
          <p className="text-sm text-slate-500 mt-1">A/B/n testing framework for revenue optimization</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New Experiment
        </button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 h-40 animate-shimmer" />
          ))
        ) : experiments.map((exp) => {
          const variants = exp.experiment_variants ?? [];
          const statusColors: Record<string, string> = {
            RUNNING: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            PAUSED: 'bg-amber-50 text-amber-700 border-amber-200',
            DRAFT: 'bg-slate-50 text-slate-600 border-slate-200',
            COMPLETED: 'bg-blue-50 text-blue-700 border-blue-200',
          };

          return (
            <div key={exp.id} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-slate-900">{exp.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[exp.status] ?? statusColors.DRAFT}`}>
                      {exp.status}
                    </span>
                  </div>
                  {exp.hypothesis && (
                    <p className="text-sm text-slate-500">{exp.hypothesis}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {exp.status === 'RUNNING' && (
                    <button onClick={() => handleAction(exp.id, 'pause')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100">
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                  )}
                  {exp.status === 'PAUSED' && (
                    <button onClick={() => handleAction(exp.id, 'start')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100">
                      <Play className="w-3.5 h-3.5" /> Resume
                    </button>
                  )}
                  {exp.status === 'DRAFT' && (
                    <button onClick={() => handleAction(exp.id, 'start')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                      <Play className="w-3.5 h-3.5" /> Start
                    </button>
                  )}
                </div>
              </div>

              {/* Variants */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {variants.map((v) => (
                  <div key={v.id} className="bg-slate-50 rounded-lg p-3">
                    <div className="text-sm font-medium text-slate-800">{v.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{v.allocation_percentage}% traffic</div>
                    {v.action && <div className="text-xs text-blue-600 mt-1">{v.action}</div>}
                  </div>
                ))}
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Target className="w-4 h-4" />
                  <span>Primary: <span className="font-medium text-slate-700">{exp.primary_metric}</span></span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Users className="w-4 h-4" />
                  <span>{exp.traffic_percentage}% traffic</span>
                </div>
                <div className="text-xs text-slate-400">Created {timeAgo(exp.created_at)}</div>
              </div>
            </div>
          );
        })}

        {!loading && experiments.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No experiments yet</p>
            <p className="text-sm mt-1">Create your first A/B experiment to optimize reader revenue</p>
          </div>
        )}
      </div>
    </div>
  );
}
