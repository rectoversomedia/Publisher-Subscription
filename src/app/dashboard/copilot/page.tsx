'use client';

import { useState } from 'react';
import { MessageSquare, Send, Bot, Database, TrendingUp, Users, DollarSign, Target, FlaskConical } from 'lucide-react';

interface Answer {
  question: string;
  result: unknown;
  summary?: string;
  sources: string[];
}

const SUGGESTED_QUESTIONS = [
  { q: 'What is the current subscription conversion rate?', fn: 'getConversionRate', icon: Target },
  { q: 'Which reader segment has the biggest revenue opportunity?', fn: 'getTopSegment', icon: TrendingUp },
  { q: 'How many high-propensity readers are currently unsubscribed?', fn: 'getHighPropensityUnsubs', icon: Users },
  { q: 'Which experiment produces the highest revenue per exposed reader?', fn: 'getBestExperiment', icon: FlaskConical },
  { q: 'What is the estimated total revenue opportunity?', fn: 'getRevenueOpportunity', icon: DollarSign },
  { q: 'How many subscribers are at high churn risk?', fn: 'getChurnRisk', icon: Users },
];

const ANALYTICS_FUNCTIONS: Record<string, { query: string; description: string; format: (data: unknown) => string }> = {
  getConversionRate: {
    query: `SELECT
      COUNT(CASE WHEN subscription_status = 'ACTIVE' THEN 1 END)::float /
      NULLIF(COUNT(CASE WHEN identity_status != 'ANONYMOUS' THEN 1 END), 0) as conversion_rate
    FROM readers`,
    description: 'Subscription conversion rate',
    format: (d) => `${((d as { conversion_rate: number }).conversion_rate ?? 0) * 100}%`,
  },
  getHighPropensityUnsubs: {
    query: `SELECT COUNT(*) as count FROM reader_features rf
    JOIN readers r ON rf.reader_id = r.id
    WHERE rf.subscription_propensity >= 60 AND r.subscription_status = 'NONE'`,
    description: 'High-propensity unsubscribed readers',
    format: (d) => `${(d as { count: number }).count ?? 0} readers`,
  },
  getChurnRisk: {
    query: `SELECT COUNT(*) as count FROM reader_features rf
    JOIN readers r ON rf.reader_id = r.id
    WHERE rf.churn_risk >= 75 AND r.subscription_status = 'ACTIVE'`,
    description: 'Active subscribers at high churn risk',
    format: (d) => `${(d as { count: number }).count ?? 0} subscribers`,
  },
  getRevenueOpportunity: {
    query: `SELECT SUM(predicted_ltv) as total FROM reader_features rf
    JOIN readers r ON rf.reader_id = r.id
    WHERE rf.subscription_propensity >= 60 AND r.subscription_status = 'NONE'`,
    description: 'Total estimated revenue opportunity',
    format: (d) => {
      const val = (d as { total: number }).total ?? 0;
      if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(2)}B`;
      if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(0)}jt`;
      return `Rp ${val.toLocaleString('id-ID')}`;
    },
  },
};

export default function CopilotPage() {
  const [messages, setMessages] = useState<Array<{ q: string; a?: Answer; loading?: boolean }>>([]);
  const [loading, setLoading] = useState(false);

  const askQuestion = async (question: string, fnKey?: string) => {
    setMessages((prev) => [...prev, { q: question, loading: true }]);
    setLoading(true);

    try {
      if (fnKey && ANALYTICS_FUNCTIONS[fnKey]) {
        const res = await fetch('/api/copilot/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ function: fnKey }),
        });
        const data = await res.json();
        setMessages((prev) => prev.map((m, i) =>
          i === prev.length - 1
            ? {
                q: question,
                a: {
                  question,
                  result: data.result,
                  summary: data.summary ?? ANALYTICS_FUNCTIONS[fnKey]!.format(data.result),
                  sources: data.sources ?? ['readers', 'reader_features'],
                },
              }
            : m
        ));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Revenue Copilot</h1>
        <p className="text-sm text-slate-500 mt-1">Ask questions about your reader revenue data — all answers from the database</p>
      </div>

      {/* Suggested Questions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-4 h-4 text-blue-500" />
          <h2 className="font-semibold text-slate-900 text-sm">Suggested Questions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SUGGESTED_QUESTIONS.map(({ q, fn, icon: Icon }) => (
            <button
              key={fn}
              onClick={() => askQuestion(q, fn)}
              disabled={loading}
              className="flex items-center gap-3 p-3 text-left bg-slate-50 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors disabled:opacity-50"
            >
              <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-700">{q}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Answers */}
      <div className="space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className="space-y-3">
            {/* Question */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-blue-600" />
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl rounded-tl-sm px-4 py-3 flex-1">
                <p className="text-sm font-medium text-blue-900">{msg.q}</p>
              </div>
            </div>

            {/* Answer */}
            {msg.loading ? (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="bg-white border border-slate-200 rounded-xl rounded-tl-sm px-4 py-3 flex-1">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                    Analyzing reader revenue data...
                  </div>
                </div>
              </div>
            ) : msg.a ? (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="bg-white border border-slate-200 rounded-xl rounded-tl-sm px-4 py-4 flex-1">
                  <p className="text-lg font-bold text-slate-900 mb-2">{msg.a.summary}</p>
                  {msg.a.summary !== msg.a.question && (
                    <p className="text-sm text-slate-600 mb-2">{msg.a.question}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Database className="w-3 h-3" />
                    {msg.a.sources.join(', ')}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
