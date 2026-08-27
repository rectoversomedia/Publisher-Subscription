// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { FlaskConical, Play, Pause, Plus, TrendingUp, Users, Target, X, Zap, CheckCircle, BarChart3 } from 'lucide-react';

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

function fmtRp(value: number): string {
  return `Rp ${value.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  RUNNING:   { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> },
  PAUSED:    { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20', icon: <Pause className="w-3 h-3" /> },
  DRAFT:     { bg: 'bg-white/[0.05]', text: 'text-white/30', border: 'border-white/[0.08]', icon: <FlaskConical className="w-3 h-3" /> },
  COMPLETED: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20', icon: <CheckCircle className="w-3 h-3" /> },
};

const METRIC_LABELS: Record<string, string> = {
  conversion_rate: 'Conversion Rate', revenue: 'Revenue',
  arpu: 'ARPU', ctr: 'Click-Through Rate', sessions: 'Sessions',
};

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', hypothesis: '', primary_metric: 'conversion_rate',
    traffic_percentage: '50', control_name: 'Control', variant_name: 'Variant A',
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, hypothesis: form.hypothesis,
          primary_metric: form.primary_metric, traffic_percentage: parseInt(form.traffic_percentage),
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
    } finally { setCreating(false); }
  };

  const running = experiments.filter(e => e.status === 'RUNNING').length;
  const totalExposures = experiments.reduce((a, e) => a + (e.experiment_variants?.reduce((v, var_) => v + var_.allocation_percentage, 0) ?? 0), 0);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-black text-white tracking-tight leading-none">A/B Experiments</h1>
          <p className="text-[11px] text-white/30 mt-2 flex items-center gap-2">
            <FlaskConical className="w-3.5 h-3.5 text-[#C41230]/50" />
            A/B/n testing framework for revenue optimization
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-[12px] font-bold text-white bg-[#C41230] rounded-xl hover:bg-[#B01028] transition-colors shadow-lg shadow-red-900/20">
          <Plus className="w-3.5 h-3.5" /> New Experiment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Experiments', value: experiments.length, icon: FlaskConical, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Running', value: running, icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Avg Traffic %', value: experiments.length > 0 ? `${Math.round(experiments.reduce((a, e) => a + e.traffic_percentage, 0) / experiments.length)}%` : '—', icon: BarChart3, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Draft', value: experiments.filter(e => e.status === 'DRAFT').length, icon: FlaskConical, color: 'text-white/30', bg: 'bg-white/[0.04]' },
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

      {/* Experiments */}
      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#111128] border border-white/[0.06] rounded-2xl p-6">
              <div className="h-20 bg-white/[0.04] rounded-xl animate-pulse" />
            </div>
          ))
        ) : experiments.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-[#111128] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <FlaskConical className="w-7 h-7 text-white/20" />
            </div>
            <p className="text-[13px] font-semibold text-white/30">No experiments yet</p>
            <p className="text-[11px] text-white/15 mt-1">Create your first A/B experiment to optimize reader revenue</p>
          </div>
        ) : (
          experiments.map((exp) => {
            const cfg = STATUS_CONFIG[exp.status] ?? STATUS_CONFIG.DRAFT;
            const isExpanded = expanded === exp.id;
            const variants = exp.experiment_variants ?? [];

            return (
              <div key={exp.id} className={`bg-[#111128] border rounded-2xl overflow-hidden transition-all ${isExpanded ? 'border-white/[0.1]' : 'border-white/[0.06]'}`}>

                {/* Header */}
                <div className="p-5" onClick={() => setExpanded(isExpanded ? null : exp.id)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                        <h3 className="text-[14px] font-bold text-white/90">{exp.name}</h3>
                        <span className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                          {cfg.icon} {exp.status}
                        </span>
                      </div>
                      {exp.hypothesis && (
                        <p className="text-[12px] text-white/35">{exp.hypothesis}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {exp.status === 'RUNNING' && (
                        <button onClick={(e) => { e.stopPropagation(); handleAction(exp.id, 'pause'); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-all">
                          <Pause className="w-3 h-3" /> Pause
                        </button>
                      )}
                      {exp.status === 'PAUSED' && (
                        <button onClick={(e) => { e.stopPropagation(); handleAction(exp.id, 'start'); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all">
                          <Play className="w-3 h-3" /> Resume
                        </button>
                      )}
                      {exp.status === 'DRAFT' && (
                        <button onClick={(e) => { e.stopPropagation(); handleAction(exp.id, 'start'); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-[#C41230] rounded-lg hover:bg-[#B01028] transition-all">
                          <Play className="w-3 h-3" /> Start
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Variants preview */}
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {variants.map((v) => (
                      <div key={v.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                        <div className="text-[12px] font-semibold text-white/60">{v.name}</div>
                        <div className="text-[10px] text-white/25 mt-0.5">{v.allocation_percentage}% traffic</div>
                        {v.action && <div className="text-[10px] text-blue-400 mt-1">{v.action}</div>}
                      </div>
                    ))}
                  </div>

                  {/* Footer metrics */}
                  <div className="flex items-center gap-5 mt-3 text-[11px] text-white/25 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Target className="w-3 h-3" />
                      {METRIC_LABELS[exp.primary_metric] ?? exp.primary_metric}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3 h-3" />
                      {exp.traffic_percentage}% traffic
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FlaskConical className="w-3 h-3" />
                      Created {timeAgo(exp.created_at)}
                    </span>
                    <span className="text-white/15 ml-auto cursor-pointer">
                      {isExpanded ? 'Collapse ↑' : 'Expand ↓'}
                    </span>
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-white/[0.05] bg-[#0D0D1F]/40 pt-4">
                    <div className="grid grid-cols-3 gap-3">
                      {variants.map((v) => (
                        <div key={v.id} className="bg-[#111128] border border-white/[0.06] rounded-xl p-4">
                          <div className="text-[12px] font-bold text-white/70 mb-3">{v.name}</div>
                          {exp.results?.find(r => r.variant_id === v.id) ? (
                            (() => {
                              const r = exp.results!.find(r => r.variant_id === v.id)!;
                              return (
                                <div className="space-y-2">
                                  const liftRow: [string, string] | null = r.lift_vs_control != null
                                    ? ['Lift', `${(r.lift_vs_control >= 0 ? '+' : '')}${(r.lift_vs_control * 100).toFixed(1)}%`]
                                    : null;
                                  {[
                                    ['Exposures', fmt(r.exposures)],
                                    ['Conversions', fmt(r.conversions)],
                                    ['Conv. Rate', `${(r.conversion_rate * 100).toFixed(1)}%`],
                                    ['Revenue', fmtRp(r.revenue)],
                                    ['Rev/Exposed', fmtRp(r.revenue_per_exposed)],
                                    ...(liftRow ? [liftRow] : []),
                                  ].map(([label, value]) => (
                                    <div key={String(label)} className="flex items-center justify-between">
                                      <span className="text-[10px] text-white/25">{String(label)}</span>
                                      <span className="text-[12px] font-mono font-bold text-white/60">{String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()
                          ) : (
                            <div className="text-[11px] text-white/20 text-center py-4">No results yet</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-[#111128] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#C41230]/15 flex items-center justify-center">
                  <FlaskConical className="w-4 h-4 text-[#FF6B7A]" />
                </div>
                <h2 className="text-[14px] font-bold text-white">New Experiment</h2>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-2 text-white/30 hover:text-white/70 hover:bg-white/[0.05] rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {[
                { key: 'name', label: 'Experiment Name *', placeholder: 'e.g. Monthly vs Annual Paywall Test', required: true },
                { key: 'hypothesis', label: 'Hypothesis', placeholder: 'e.g. Showing annual plan will increase LTV vs monthly' },
              ].map(({ key, label, placeholder, required }) => (
                <div key={key}>
                  <label className="block text-[11px] font-semibold text-white/40 mb-1.5">{label}</label>
                  <input
                    required={required}
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3.5 py-2.5 text-[13px] bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#C41230]/40 transition-all"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-white/40 mb-1.5">Primary Metric</label>
                  <select value={form.primary_metric} onChange={(e) => setForm((f) => ({ ...f, primary_metric: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-[13px] bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#C41230]/40 transition-all appearance-none">
                    {Object.entries(METRIC_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-white/40 mb-1.5">Traffic %</label>
                  <input type="number" min="5" max="100" value={form.traffic_percentage}
                    onChange={(e) => setForm((f) => ({ ...f, traffic_percentage: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-[13px] bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#C41230]/40 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(['control_name', 'variant_name'] as const).map((key) => (
                  <div key={key}>
                    <label className="block text-[11px] font-semibold text-white/40 mb-1.5 capitalize">{key.replace('_', ' ')}</label>
                    <input value={(form as Record<string, string>)[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-[13px] bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#C41230]/40 transition-all" />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 text-[12px] text-white/40 border border-white/[0.08] rounded-xl hover:bg-white/[0.04] transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={creating || !form.name.trim()}
                  className="px-5 py-2.5 text-[12px] font-bold text-white bg-[#C41230] rounded-xl hover:bg-[#B01028] disabled:opacity-50 transition-all">
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
