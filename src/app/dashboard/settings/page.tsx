'use client';

import { useEffect, useState } from 'react';
import { Settings, ToggleLeft, ToggleRight, Save, AlertTriangle } from 'lucide-react';

interface ConfigValue {
  execution_mode?: string;
  traffic_rollout?: number;
  feature_flags?: Record<string, boolean>;
  decision_thresholds?: Record<string, number>;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Record<string, { key: string; value: unknown }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((d) => { setConfig(d.data ?? {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, item] of Object.entries(config)) {
        await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value: item.value }),
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key: string, newValue: unknown) => {
    setConfig((prev) => ({
      ...prev,
      [key]: { key, value: newValue },
    }));
  };

  if (loading) return <div className="py-20 text-center text-slate-500">Loading configuration...</div>;

  const executionMode = (config.execution_mode?.value as string) ?? 'LIVE';
  const trafficRollout = (config.traffic_rollout?.value as number) ?? 100;
  const featureFlags = (config.feature_flags?.value as Record<string, boolean>) ?? {};
  const thresholds = (config.decision_thresholds?.value as Record<string, number>) ?? {};

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
              onClick={() => updateConfig('execution_mode', { key: 'execution_mode', value: mode })}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                executionMode === mode
                  ? mode === 'LIVE' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                    mode === 'SHADOW' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {executionMode === 'SHADOW' ? 'Revenue Brain calculates recommendations but does not change user experience.' :
           executionMode === 'CONTROLLED' ? 'Applies to configured percentage of eligible traffic.' :
           'Full eligible traffic receives Revenue Brain treatment.'}
        </p>
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
            onChange={(e) => updateConfig('traffic_rollout', { key: 'traffic_rollout', value: parseInt(e.target.value) })}
            className="flex-1"
          />
          <span className="text-lg font-bold text-slate-900 w-16 text-right">{trafficRollout}%</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">Percentage of eligible traffic receiving Revenue Brain treatment</p>
      </div>

      {/* Feature Flags */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Feature Flags</h2>
        <div className="space-y-4">
          {Object.entries(featureFlags).map(([flag, enabled]) => (
            <div key={flag} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-700">{flag.replace(/_/g, ' ')}</div>
                <div className="text-xs text-slate-400">
                  {flag === 'enable_news_moments' ? 'Detect and respond to traffic spikes' :
                   flag === 'enable_copilot' ? 'Enable Revenue Copilot interface' :
                   flag === 'enable_ltv' ? 'Calculate estimated LTV scores' :
                   flag === 'enable_churn' ? 'Calculate churn risk scores' :
                   flag === 'enable_shadow_mode' ? 'Allow SHADOW execution mode' : flag}
                </div>
              </div>
              <button
                onClick={() => updateConfig('feature_flags', {
                  key: 'feature_flags',
                  value: { ...featureFlags, [flag]: !enabled },
                })}
                className="flex items-center"
              >
                {enabled
                  ? <ToggleRight className="w-8 h-8 text-blue-600" />
                  : <ToggleLeft className="w-8 h-8 text-slate-300" />}
              </button>
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
              <div className="w-48 text-sm text-slate-700">{key.replace(/_/g, ' ')}</div>
              <input
                type="number"
                min="0"
                max="100"
                value={value}
                onChange={(e) => updateConfig('decision_thresholds', {
                  key: 'decision_thresholds',
                  value: { ...thresholds, [key]: parseInt(e.target.value) },
                })}
                className="w-24 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Configuration'}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Configuration updated successfully</span>}
      </div>
    </div>
  );
}
