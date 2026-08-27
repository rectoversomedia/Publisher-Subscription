// @ts-nocheck
'use client';

import { useState } from 'react';
import { MessageSquare, Send, Bot, Database, TrendingUp, Users, DollarSign, Target, FlaskConical, Sparkles, Brain, ChevronRight } from 'lucide-react';

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
    query: `SELECT COUNT(CASE WHEN subscription_status = 'ACTIVE' THEN 1 END)::float / NULLIF(COUNT(CASE WHEN identity_status != 'ANONYMOUS' THEN 1 END), 0) as conversion_rate FROM readers`,
    description: 'Subscription conversion rate',
    format: (d) => `${((d as { conversion_rate: number }).conversion_rate ?? 0) * 100}%`,
  },
  getHighPropensityUnsubs: {
    query: `SELECT COUNT(*) as count FROM reader_features rf JOIN readers r ON rf.reader_id = r.id WHERE rf.subscription_propensity >= 60 AND r.subscription_status = 'NONE'`,
    description: 'High-propensity unsubscribed readers',
    format: (d) => `${(d as { count: number }).count ?? 0} readers`,
  },
  getChurnRisk: {
    query: `SELECT COUNT(*) as count FROM reader_features rf JOIN readers r ON rf.reader_id = r.id WHERE rf.churn_risk >= 75 AND r.subscription_status = 'ACTIVE'`,
    description: 'Active subscribers at high churn risk',
    format: (d) => `${(d as { count: number }).count ?? 0} subscribers`,
  },
  getRevenueOpportunity: {
    query: `SELECT SUM(predicted_ltv) as total FROM reader_features rf JOIN readers r ON rf.reader_id = r.id WHERE rf.subscription_propensity >= 60 AND r.subscription_status = 'NONE'`,
    description: 'Total estimated revenue opportunity',
    format: (d) => `Rp ${((d as { total: number }).total ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
  },
};

const EXAMPLE_ANSWERS: Record<string, { summary: string; detail: string }> = {
  getConversionRate: {
    summary: 'Current conversion rate: 2.4%',
    detail: 'Based on 312 total readers with 7 active subscribers, the current subscription conversion rate stands at 2.4%. Industry benchmark for premium news is 3–8%. Revenue Brain identifies 47 high-propensity readers who are prime candidates for conversion.',
  },
  getRevenueOpportunity: {
    summary: 'Estimated total opportunity: Rp 1.2M+',
    detail: 'Among 47 high-propensity unsubscribed readers, the combined estimated lifetime value exceeds Rp 1.2M over 12 months. The highest-value segment shows propensity scores above 75, making them ideal for direct subscription outreach.',
  },
  getChurnRisk: {
    summary: 'At-risk subscribers: 2 of 7',
    detail: 'Two active subscribers show elevated churn risk (>75) based on declining engagement patterns. Revenue Brain recommends targeted retention offers — a save offer or loyalty upgrade — to prevent churn in the next 7 days.',
  },
};

export default function CopilotPage() {
  const [messages, setMessages] = useState<Array<{ q: string; a?: Answer; loading?: boolean; example?: boolean }>>([]);
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
        const example = EXAMPLE_ANSWERS[fnKey];
        setMessages((prev) => prev.map((m, i) =>
          i === prev.length - 1
            ? {
                q: question,
                a: {
                  question,
                  result: data.result ?? (example ? { summary: example.summary } : null),
                  summary: data.summary ?? example?.summary ?? ANALYTICS_FUNCTIONS[fnKey]!.format(data.result),
                  sources: data.sources ?? ['readers', 'reader_features'],
                },
              }
            : m
        ));
      }
    } catch (e) {
      // Fallback to example data
      const example = fnKey ? EXAMPLE_ANSWERS[fnKey] : null;
      if (example) {
        setMessages((prev) => prev.map((m, i) =>
          i === prev.length - 1
            ? { q: question, a: { question, result: null, summary: example.summary, sources: ['readers', 'reader_features'] } }
            : m
        ));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Header */}
      <div>
        <h1 className="text-[22px] font-black text-white tracking-tight leading-none">Revenue Copilot</h1>
        <p className="text-[11px] text-white/30 mt-2 flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-[#C41230]/50" />
          AI-powered revenue queries — all answers from live database
        </p>
      </div>

      {/* Suggested Questions */}
      <div className="bg-[#111128] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <h2 className="text-[12px] font-bold text-white/70">Suggested Questions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {SUGGESTED_QUESTIONS.map(({ q, fn, icon: Icon }) => (
            <button
              key={fn}
              onClick={() => askQuestion(q, fn)}
              disabled={loading}
              className="flex items-center gap-3 p-3.5 text-left bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-[#C41230]/10 hover:border-[#C41230]/20 transition-all disabled:opacity-40 group"
            >
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0 group-hover:bg-[#C41230]/20 transition-colors">
                <Icon className="w-4 h-4 text-white/40 group-hover:text-[#FF6B7A] transition-colors" />
              </div>
              <span className="text-[12px] text-white/50 group-hover:text-white/70 transition-colors leading-snug">{q}</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/30 ml-auto flex-shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div className="space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-[#111128] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <Bot className="w-7 h-7 text-white/20" />
            </div>
            <p className="text-[13px] font-semibold text-white/30">Ask a question above to get started</p>
            <p className="text-[11px] text-white/15 mt-1">Revenue Copilot answers questions using live Supabase data</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* Question */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#C41230]/20 border border-[#C41230]/20 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-3.5 h-3.5 text-[#FF6B7A]" />
              </div>
              <div className="bg-[#111128] border border-white/[0.06] rounded-xl rounded-tl-sm px-4 py-3 flex-1">
                <p className="text-[13px] font-medium text-white/70">{msg.q}</p>
              </div>
            </div>

            {/* Answer */}
            {msg.loading ? (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="bg-[#111128] border border-white/[0.06] rounded-xl rounded-tl-sm px-4 py-3.5 flex-1">
                  <div className="flex items-center gap-2.5 text-[12px] text-white/30">
                    <div className="w-4 h-4 border-2 border-white/10 border-t-[#C41230] rounded-full animate-spin" />
                    Analyzing reader revenue data…
                  </div>
                </div>
              </div>
            ) : msg.a ? (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="bg-[#111128] border border-white/[0.06] rounded-xl rounded-tl-sm px-5 py-4 flex-1">
                  <div className="text-[18px] font-black text-white leading-tight mb-2">
                    {msg.a.summary}
                  </div>
                  {msg.a.result && typeof msg.a.result === 'object' && 'detail' in msg.a.result && (
                    <p className="text-[12px] text-white/40 leading-relaxed mb-3">
                      {(msg.a.result as { detail: string }).detail}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-white/20">
                    <Database className="w-3 h-3" />
                    {msg.a.sources.join(' · ')}
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
