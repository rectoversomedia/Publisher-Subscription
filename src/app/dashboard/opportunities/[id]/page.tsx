'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, AlertTriangle, Zap, TrendingUp, CheckCircle } from 'lucide-react';

interface Opportunity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  estimated_audience: number;
  estimated_incremental_revenue: number;
  recommended_action: string | null;
  supporting_metrics: Record<string, unknown>;
  detected_at: string;
  resolved_at: string | null;
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

export default function OpportunityDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch('/api/v1/opportunities')
      .then((r) => r.json())
      .then((d) => {
        const found = (d.data ?? []).find((o: Opportunity) => o.id === id);
        if (found) setOpportunity(found);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleResolve = async () => {
    if (!opportunity) return;
    setResolving(true);
    await fetch(`/api/v1/opportunities?id=${opportunity.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'RESOLVED' }),
    });
    setOpportunity((prev) => prev ? { ...prev, status: 'RESOLVED', resolved_at: new Date().toISOString() } : prev);
    setResolving(false);
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Loading opportunity…</div>;
  if (!opportunity) return <div className="py-20 text-center text-slate-400">Opportunity not found</div>;

  const severityColors: Record<string, { bg: string; text: string; icon: typeof AlertTriangle }> = {
    CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', icon: AlertTriangle },
    HIGH: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Zap },
    MEDIUM: { bg: 'bg-blue-50', text: 'text-blue-700', icon: TrendingUp },
    LOW: { bg: 'bg-slate-50', text: 'text-slate-600', icon: CheckCircle },
  };

  const sev = severityColors[opportunity.severity] ?? severityColors.LOW;
  const SeverityIcon = sev.icon;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/opportunities" className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{opportunity.title}</h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${sev.bg} ${sev.text}`}>
                <SeverityIcon className="w-3.5 h-3.5" />
                {opportunity.severity}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span className="font-mono">{opportunity.type.replace(/_/g, ' ')}</span>
              <span>·</span>
              <span>Detected {timeAgo(opportunity.detected_at)}</span>
              {opportunity.resolved_at && (
                <>
                  <span>·</span>
                  <span className="text-emerald-600">Resolved {timeAgo(opportunity.resolved_at)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {opportunity.status !== 'RESOLVED' && (
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            {resolving ? 'Resolving…' : 'Mark Resolved'}
          </button>
        )}
      </div>

      {/* Description */}
      {opportunity.description && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm text-slate-700 leading-relaxed">{opportunity.description}</p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <div className="text-2xl font-bold text-slate-900">{fmt(opportunity.estimated_audience)}</div>
          <div className="text-xs text-slate-500 mt-1">Estimated Audience</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <div className="text-2xl font-bold text-emerald-600">{fmt(opportunity.estimated_incremental_revenue)}</div>
          <div className="text-xs text-slate-500 mt-1">Est. Incremental Revenue</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <div className={`text-sm font-semibold ${opportunity.status === 'RESOLVED' ? 'text-emerald-600' : 'text-amber-600'}`}>
            {opportunity.status}
          </div>
          <div className="text-xs text-slate-500 mt-1">Status</div>
        </div>
      </div>

      {/* Recommended Action */}
      {opportunity.recommended_action && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Recommended Action</div>
          <div className="text-sm text-blue-800 font-medium">{opportunity.recommended_action}</div>
        </div>
      )}

      {/* Supporting Metrics */}
      {opportunity.supporting_metrics && Object.keys(opportunity.supporting_metrics).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Supporting Metrics</h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(opportunity.supporting_metrics).map(([key, val]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-slate-500">{key.replace(/_/g, ' ')}</span>
                <span className="font-semibold text-slate-900">
                  {typeof val === 'number' ? fmt(val) : String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
