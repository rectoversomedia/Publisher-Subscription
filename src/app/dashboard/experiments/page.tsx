'use client';

import { useEffect, useState } from 'react';
import { FlaskConical, Play, Pause, Plus, TrendingUp, Users, Target, X } from 'lucide-react';

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

function fmt(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
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
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    hypothesis: '',
    primary_metric: 'conversion_rate',
    traffic_percentage: '50',
    control_name: 'Control',
    variant_name: 'Variant A',
  });

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/v1/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          hypothesis: form.hypothesis,
          primary_metric: form.primary_metric,
          traffic_percentage: parseInt(form.traffic_percentage),
          variants: [
            { name: form.control_name || 'Control', allocation_percentage: 50 },
            { name: form.variant_name || 'Variant A', allocation_percentage: 50 },
          ],
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({ name: '', hypothesis: '', primary_metric: 'conversion_rate', traffic_percentage: '50', control_name: 'Control', variant_name: 'Variant A' });
        fetchExperiments();
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Experiments</h1>
          <p className="text-sm text-slate-500 mt-1">A/B/n testing framework for revenue optimization</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
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

      {/* Create Experiment Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FlaskConical className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">New Experiment</h2>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Experiment Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Monthly vs Annual Paywall Test"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Hypothesis</label>
                <input
                  value={form.hypothesis}
                  onChange={(e) => setForm((f) => ({ ...f, hypothesis: e.target.value }))}
                  placeholder="e.g. Showing annual plan will increase LTV vs monthly"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Primary Metric</label>
                  <select
                    value={form.primary_metric}
                    onChange={(e) => setForm((f) => ({ ...f, primary_metric: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="conversion_rate">Conversion Rate</option>
                    <option value="revenue">Revenue</option>
                    <option value="arpu">ARPU</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Traffic %</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={form.traffic_percentage}
                    onChange={(e) => setForm((f) => ({ ...f, traffic_percentage: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Control Name</label>
                  <input
                    value={form.control_name}
                    onChange={(e) => setForm((f) => ({ ...f, control_name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Variant Name</label>
                  <input
                    value={form.variant_name}
                    onChange={(e) => setForm((f) => ({ ...f, variant_name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !form.name.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Create Experiment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
