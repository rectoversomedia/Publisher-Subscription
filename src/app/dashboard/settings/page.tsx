'use client';

import { useEffect, useState } from 'react';
import { Settings, ToggleLeft, ToggleRight, Save, CheckCircle, AlertCircle } from 'lucide-react';

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

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="h-8 w-64 bg-slate-100 rounded animate-pulse" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const executionMode = (config.execution_mode?.value as string) ?? 'LIVE';
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

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuration</h1>
        <p className="text-sm text-slate-500 mt-1">Control Revenue Brain behavior — changes take effect immediately</p>
      </div>

      {/* Execution Mode */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Execution Mode</h2>
        <div className="flex gap-3">
          {['SHADOW', 'CONTROLLED', 'LIVE'].map((mode) => (
            <button
              key={mode}
              onClick={() => handleSave('execution_mode', mode)}
              disabled={saveStates['execution_mode'] === 'saving'}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                executionMode === mode
                  ? mode === 'LIVE' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                    mode === 'SHADOW' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              } ${saveStates['execution_mode'] === 'saving' ? 'opacity-50' : ''}`}
            >
              {mode === 'SHADOW' ? 'Shadow' : mode === 'CONTROLLED' ? 'Controlled' : 'Live'}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {executionMode === 'SHADOW'
            ? 'Revenue Brain calculates recommendations but does not change user experience.'
            : executionMode === 'CONTROLLED'
              ? 'Applies to configured percentage of eligible traffic.'
              : 'Full eligible traffic receives Revenue Brain treatment.'}
        </p>
        <SaveIndicator state={saveStates['execution_mode']} />
      </div>

      {/* Traffic Rollout */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Traffic Rollout</h2>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={trafficRollout}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setConfig((prev) => ({ ...prev, traffic_rollout: { key: 'traffic_rollout', value: val } }));
            }}
            onMouseUp={(e) => handleSave('traffic_rollout', parseInt((e.target as HTMLInputElement).value))}
            className="flex-1"
          />
          <span className="text-lg font-bold text-slate-900 w-16 text-right">{trafficRollout}%</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">Percentage of eligible traffic receiving Revenue Brain treatment</p>
        <SaveIndicator state={saveStates['traffic_rollout']} />
      </div>

      {/* Feature Flags */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Feature Flags</h2>
        <div className="space-y-4">
          {Object.entries(featureFlags).map(([flag, enabled]) => (
            <div key={flag} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-700 capitalize">
                  {flag.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </div>
                <div className="text-xs text-slate-400">{flagDescriptions[flag] ?? flag}</div>
              </div>
              <div className="flex items-center gap-2">
                <SaveIndicator state={saveStates[flag] ?? 'idle'} />
                <button
                  onClick={() => handleSave('feature_flags', { ...featureFlags, [flag]: !enabled })}
                  className="flex items-center"
                  aria-label={`Toggle ${flag}`}
                >
                  {enabled
                    ? <ToggleRight className="w-8 h-8 text-blue-600" />
                    : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decision Thresholds */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Decision Thresholds</h2>
        <div className="space-y-4">
          {Object.entries(thresholds).map(([key, value]) => (
            <div key={key} className="flex items-center gap-4">
              <div className="w-56 text-sm text-slate-700 capitalize">
                {thresholdLabels[key] ?? key.replace(/_/g, ' ')}
              </div>
              <input
                type="number"
                min="0"
                max="100"
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
                onBlur={(e) => handleSave('decision_thresholds', { ...thresholds, [key]: parseInt(e.target.value) })}
                className="w-24 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <SaveIndicator state={saveStates[key] ?? 'idle'} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state?: SaveState }) {
  if (state === 'idle') return null;
  if (state === 'saving') {
    return <span className="text-xs text-slate-400 animate-pulse">Saving…</span>;
  }
  if (state === 'saved') {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600">
        <CheckCircle className="w-3.5 h-3.5" /> Saved
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-red-500">
      <AlertCircle className="w-3.5 h-3.5" /> Failed
    </span>
  );
}
