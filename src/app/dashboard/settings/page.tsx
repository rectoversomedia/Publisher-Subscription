'use client';

import { useEffect, useState } from 'react';
import {
  Settings, ToggleLeft, ToggleRight, Save, CheckCircle, AlertCircle,
  Activity, Zap, ShieldCheck, Clock, BarChart3
} from 'lucide-react';

type ConfigRow = { key: string; value: unknown };
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function SettingsPage() {
  const [config, setConfig] = useState<Record<string, ConfigRow>>({});
  const [loading, setLoading] = useState(true);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((d) => { setConfig(d.data ?? {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (key: string, value: unknown) => {
    setSaveStates((prev) => ({ ...prev, [key]: 'saving' }));
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        setConfig((prev) => ({ ...prev, [key]: { key, value } }));
        setSaveStates((prev) => ({ ...prev, [key]: 'saved' }));
        setTimeout(() => setSaveStates((prev) => ({ ...prev, [key]: 'idle' })), 2500);
      } else {
        setSaveStates((prev) => ({ ...prev, [key]: 'error' }));
      }
    } catch {
      setSaveStates((prev) => ({ ...prev, [key]: 'error' }));
    }
  };

  const executionMode = (config.execution_mode?.value as string) ?? 'SHADOW';
  const trafficRollout = (config.traffic_rollout?.value as number) ?? 100;
  const featureFlags = (config.feature_flags?.value as Record<string, boolean>) ?? {};
  const thresholds = (config.decision_thresholds?.value as Record<string, number>) ?? {};

  const flagDescriptions: Record<string, string> = {
    enable_news_moments: 'Detect and respond to breaking news traffic spikes',
    enable_copilot: 'Enable Revenue Copilot natural-language interface',
    enable_ltv: 'Calculate and display estimated LTV scores',
    enable_churn: 'Calculate churn risk scores for active subscribers',
    enable_shadow_mode: 'Allow SHADOW execution mode',
  };

  const thresholdLabels: Record<string, string> = {
    very_high_propensity: 'Very High Propensity (offer annual)',
    high_propensity: 'High Propensity (offer monthly)',
    low_propensity: 'Low Propensity (allow free)',
    high_churn_risk: 'High Churn Risk (retention action)',
  };

  const modeDescriptions: Record<string, string> = {
    SHADOW: 'Revenue Brain calculates recommendations but does not change user experience. Safe for testing.',
    CONTROLLED: 'Applies to configured percentage of eligible traffic. Gradual rollout.',
    LIVE: 'Full eligible traffic receives Revenue Brain treatment. Revenue-generating.',
  };

  if (loading) return (
    <div className="space-y-4 max-w-3xl">
      <div className="h-8 w-64 bg-white/[0.04] rounded animate-pulse" />
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-[#111128] border border-white/[0.06] rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-[22px] font-black text-white tracking-tight leading-none">Configuration</h1>
        <p className="text-[11px] text-white/30 mt-2 flex items-center gap-2">
          <Settings className="w-3.5 h-3.5 text-[#C41230]/50" />
          Control Revenue Brain behavior — changes take effect immediately
        </p>
      </div>

      {/* Execution Mode */}
      <div className="bg-[#111128] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <h2 className="text-[12px] font-bold text-white/70">Execution Mode</h2>
          <span className={`ml-auto text-[10px] px-2 py-1 rounded-md font-bold ${
            executionMode === 'LIVE' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
            executionMode === 'SHADOW' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
            'bg-blue-500/15 text-blue-400 border border-blue-500/20'
          }`}>
            {executionMode}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(['SHADOW', 'CONTROLLED', 'LIVE'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => handleSave('execution_mode', mode)}
              disabled={saveStates['execution_mode'] === 'saving'}
              className={`p-4 rounded-xl text-center transition-all border ${
                executionMode === mode
                  ? mode === 'LIVE' ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400' :
                    mode === 'SHADOW' ? 'bg-amber-500/15 border-amber-500/25 text-amber-400' :
                    'bg-blue-500/15 border-blue-500/25 text-blue-400'
                  : 'bg-white/[0.03] border-white/[0.06] text-white/30 hover:bg-white/[0.06] hover:text-white/50'
              }`}
            >
              <div className="text-[16px] font-black mb-1">{mode === 'SHADOW' ? 'Shadow' : mode === 'CONTROLLED' ? 'Controlled' : 'Live'}</div>
              <div className="text-[10px] text-white/25 leading-tight">{modeDescriptions[mode]}</div>
            </button>
          ))}
        </div>
        <SaveIndicator state={saveStates['execution_mode']} />
      </div>

      {/* Traffic Rollout */}
      <div className="bg-[#111128] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-amber-400" />
          <h2 className="text-[12px] font-bold text-white/70">Traffic Rollout</h2>
        </div>
        <div className="flex items-center gap-4 mb-3">
          <input
            type="range" min="0" max="100" step="5"
            value={trafficRollout}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setConfig((prev) => ({ ...prev, traffic_rollout: { key: 'traffic_rollout', value: val } }));
            }}
            onMouseUp={(e) => handleSave('traffic_rollout', parseInt((e.target as HTMLInputElement).value))}
            className="flex-1 accent-[#C41230]"
          />
          <span className="text-[18px] font-black text-white w-16 text-right font-mono">{trafficRollout}%</span>
        </div>
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#C41230] to-[#FF6B7A] rounded-full transition-all"
            style={{ width: `${trafficRollout}%` }} />
        </div>
        <p className="text-[11px] text-white/25 mt-2">Percentage of eligible traffic receiving Revenue Brain treatment</p>
        <SaveIndicator state={saveStates['traffic_rollout']} />
      </div>

      {/* Feature Flags */}
      <div className="bg-[#111128] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h2 className="text-[12px] font-bold text-white/70">Feature Flags</h2>
        </div>
        <div className="space-y-3">
          {Object.entries(featureFlags).map(([flag, enabled]) => (
            <div key={flag} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/[0.04]">
              <div>
                <div className="text-[12px] font-semibold text-white/60 capitalize">
                  {flag.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </div>
                <div className="text-[10px] text-white/25 mt-0.5">{flagDescriptions[flag] ?? flag}</div>
              </div>
              <div className="flex items-center gap-3">
                <SaveIndicator state={saveStates[flag] ?? 'idle'} />
                <button
                  onClick={() => handleSave('feature_flags', { ...featureFlags, [flag]: !enabled })}
                  className="flex items-center"
                  aria-label={`Toggle ${flag}`}
                >
                  {enabled
                    ? <ToggleRight className="w-8 h-8 text-[#C41230]" />
                    : <ToggleLeft className="w-8 h-8 text-white/20" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decision Thresholds */}
      <div className="bg-[#111128] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <h2 className="text-[12px] font-bold text-white/70">Decision Thresholds</h2>
        </div>
        <div className="space-y-3">
          {Object.entries(thresholds).map(([key, value]) => (
            <div key={key} className="flex items-center gap-4 p-3 bg-white/[0.03] rounded-xl border border-white/[0.04]">
              <div className="w-56 text-[12px] text-white/50 capitalize flex-shrink-0">
                {thresholdLabels[key] ?? key.replace(/_/g, ' ')}
              </div>
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="range" min="0" max="100" step="5"
                  value={value}
                  onChange={(e) => {
                    const newVal = parseInt(e.target.value);
                    setConfig((prev) => ({
                      ...prev,
                      decision_thresholds: {
                        key: 'decision_thresholds',
                        value: { ...thresholds, [key]: newVal },
                      },
                    }));
                  }}
                  onMouseUp={(e) => handleSave('decision_thresholds', { ...thresholds, [key]: parseInt((e.target as HTMLInputElement).value) })}
                  className="flex-1 accent-[#C41230]"
                />
                <span className="text-[13px] font-mono font-bold text-white/60 w-10 text-right">{value}</span>
              </div>
              <SaveIndicator state={saveStates[key] ?? 'idle'} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state?: SaveState }) {
  if (state === 'idle' || state === undefined) return null;
  if (state === 'saving') return <span className="text-[11px] text-white/25 animate-pulse flex items-center gap-1"><Clock className="w-3 h-3" />Saving…</span>;
  if (state === 'saved') return (
    <span className="flex items-center gap-1 text-[11px] text-emerald-400">
      <CheckCircle className="w-3.5 h-3.5" /> Saved
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[11px] text-red-400">
      <AlertCircle className="w-3.5 h-3.5" /> Failed
    </span>
  );
}
