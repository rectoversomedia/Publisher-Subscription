'use client';

import { useState, useCallback, useEffect } from 'react';
import { Play, Pause, RotateCcw, Zap, Brain, ChevronRight, Target, RefreshCw, TrendingUp } from 'lucide-react';

// ── Demo Reader Scenarios ────────────────────────────────────

const DEMO_READERS = [
  {
    id: 'demo_casual',
    name: 'Casual Visitor',
    description: 'New anonymous visitor from Google',
    avatar: 'A',
    features: {
      engagement_score: 15,
      subscription_propensity: 18,
      price_sensitivity: 85,
      content_loyalty: 5,
      churn_risk: 0,
      predicted_ltv: 24000,
    },
    topic_affinity: { Politics: 12, Lifestyle: 45, Sports: 38 },
    subscription_status: 'NONE',
    identity_status: 'ANONYMOUS',
    days_since_last_visit: 0,
    sessions_7d: 1,
    sessions_30d: 1,
    articles_30d: 2,
    premium_articles_30d: 0,
    expectedAction: 'ALLOW_FREE',
    expectedConfidence: 0.9,
  },
  {
    id: 'demo_engaged',
    name: 'Engaged Reader',
    description: 'Returning reader with high engagement',
    avatar: 'B',
    features: {
      engagement_score: 72,
      subscription_propensity: 78,
      price_sensitivity: 68,
      content_loyalty: 55,
      churn_risk: 0,
      predicted_ltv: 387000,
    },
    topic_affinity: { Politics: 68, Investigation: 84, Economy: 52 },
    subscription_status: 'NONE',
    identity_status: 'REGISTERED',
    days_since_last_visit: 2,
    sessions_7d: 5,
    sessions_30d: 18,
    articles_30d: 31,
    premium_articles_30d: 22,
    expectedAction: 'SHOW_MONTHLY',
    expectedConfidence: 0.82,
  },
  {
    id: 'demo_high_intent',
    name: 'High Intent Reader',
    description: 'Investigative journalism loyalist',
    avatar: 'C',
    features: {
      engagement_score: 91,
      subscription_propensity: 93,
      price_sensitivity: 21,
      content_loyalty: 88,
      churn_risk: 0,
      predicted_ltv: 487000,
    },
    topic_affinity: { Investigation: 94, Politics: 89, Business: 51 },
    subscription_status: 'NONE',
    identity_status: 'REGISTERED',
    days_since_last_visit: 1,
    sessions_7d: 12,
    sessions_30d: 38,
    articles_30d: 67,
    premium_articles_30d: 58,
    expectedAction: 'SHOW_ANNUAL',
    expectedConfidence: 0.88,
  },
  {
    id: 'demo_former',
    name: 'Former Subscriber',
    description: 'Expired subscriber re-engaging',
    avatar: 'D',
    features: {
      engagement_score: 65,
      subscription_propensity: 55,
      price_sensitivity: 72,
      content_loyalty: 62,
      churn_risk: 0,
      predicted_ltv: 220000,
    },
    topic_affinity: { Politics: 78, Opinion: 61 },
    subscription_status: 'EXPIRED',
    identity_status: 'KNOWN',
    days_since_last_visit: 3,
    sessions_7d: 4,
    sessions_30d: 12,
    articles_30d: 24,
    premium_articles_30d: 18,
    expectedAction: 'SHOW_WINBACK',
    expectedConfidence: 0.78,
  },
  {
    id: 'demo_at_risk',
    name: 'At-Risk Subscriber',
    description: 'Active subscriber with declining engagement',
    avatar: 'E',
    features: {
      engagement_score: 28,
      subscription_propensity: 82,
      price_sensitivity: 35,
      content_loyalty: 70,
      churn_risk: 82,
      predicted_ltv: 312000,
    },
    topic_affinity: { Politics: 85, Investigation: 72 },
    subscription_status: 'ACTIVE',
    identity_status: 'KNOWN',
    days_since_last_visit: 8,
    sessions_7d: 1,
    sessions_30d: 8,
    articles_30d: 12,
    premium_articles_30d: 10,
    expectedAction: 'SHOW_SAVE_OFFER',
    expectedConfidence: 0.85,
  },
];

// ── Article Content ────────────────────────────────────────

const ARTICLE = {
  title: 'Investigasi: compounds Korupsi dalam Proyek Infrastruktur Negara',
  category: 'Investigasi',
  author: 'Tim Investigasi Tempo',
  is_premium: true,
  read_time: '12 min read',
  content: `Surat dari dokumen yang diperoleh Tempo menunjukkan bahwa sebagian besar anggaran proyek dialihkan ke rekening pribadi melalui jaringan perusahaan cangkang. Menurut sumber yang dekat dengan investigasi, setidaknya tiga pejabat senior terlibat dalam pengalihan dana tersebut.

"Ini adalah salah satu kasus korupsi terbesar yang pernah kami dokumentasikan," kata seorang investigator yang menolak disebutkan namanya. "Jaringan ini sudah beroperasi selama hampir satu dekade."

Para ahli mengatakan bahwa regulasi yang lemah dan kurangnya pengawasan dari lembaga penegak hukum memungkinkan praktik ini terus berlangsung. Meskipun beberapa upaya telah dilakukan untuk memberantas korupsi, hasilnya masih jauh dari memadai.

Dalam dokumen yang kami miliki, terlihat jelas bagaimana dana publik dialirkan melalui serangkaian transaksi yang dirancang untuk menyamarkan asalnya. Setiap transaksi tampak sah di atas kertas, tetapi ketika ditelusuri secara keseluruhan, pola yang mencurigakan menjadi sangat jelas.

Pihak berwenang telah diberitahu tentang temuan ini, tetapi hingga saat ini belum ada tindakan yang diambil. Tempo akan terus memantau situasi ini dan memberikan pembaruan seiring berjalannya waktu.`,
};

// ── Helper Functions ────────────────────────────────────────

function ScoreBar({ label, value, max = 100, color }: { label: string; value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const colors: Record<string, string> = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-800">{value}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${colors[color ?? 'blue']} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatRupiah(value: number): string {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
  return `Rp ${value.toLocaleString('id-ID')}`;
}

const ACTION_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ALLOW_FREE: { label: 'Free Access', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
  SHOW_REGISTRATION: { label: 'Registration Wall', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  SHOW_NEWSLETTER_GATE: { label: 'Newsletter Gate', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  SHOW_MONTHLY: { label: 'Monthly Subscription', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  SHOW_ANNUAL: { label: 'Annual Subscription', color: 'text-emerald-800', bg: 'bg-emerald-100', border: 'border-emerald-300' },
  SHOW_TRIAL: { label: 'Free Trial', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  SHOW_WINBACK: { label: 'Winback Offer', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  SHOW_SAVE_OFFER: { label: 'Save Offer', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  NO_ACTION: { label: 'No Action', color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200' },
};

const REASON_EXPLANATIONS: Record<string, string[]> = {
  ALLOW_FREE: ['New reader', 'Low subscription propensity'],
  SHOW_REGISTRATION: ['Medium propensity', 'Registered reader'],
  SHOW_MONTHLY: ['High subscription propensity', 'Medium price sensitivity', 'High engagement'],
  SHOW_ANNUAL: ['Very high subscription propensity', 'Low price sensitivity', 'Investigative content loyalty', 'Strong engagement'],
  SHOW_WINBACK: ['Former subscriber', 'Returning with high engagement', 'Re-engagement signal'],
  SHOW_SAVE_OFFER: ['Active subscriber', 'High churn risk', 'Declining engagement'],
  SHOW_TRIAL: ['High propensity', 'High price sensitivity', 'Reduce friction'],
};

// ── Main Demo Component ──────────────────────────────────────

export default function DemoPage() {
  const [activeReader, setActiveReader] = useState(DEMO_READERS[2]!); // Start with high-intent
  const [events, setEvents] = useState<string[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);
  const [readProgress, setReadProgress] = useState(0);

  const actionConfig = ACTION_LABELS[activeReader.expectedAction] ?? ACTION_LABELS['ALLOW_FREE']!;
  const reasons = REASON_EXPLANATIONS[activeReader.expectedAction] ?? [];

  const simulateReader = useCallback(() => {
    if (!simulating) return;
    const eventSequence = [
      'Google Search → Article',
      'Article View',
      'Read 25%',
      'Read 50%',
      'Premium Content',
      'Read 75%',
      'Article Complete',
      'Revenue Brain Decision',
    ] as const;

    let step = 0;
    const interval = setInterval(() => {
      if (step < eventSequence.length) {
        setEvents((prev) => [...prev.slice(-6), eventSequence[step] ?? '']);
        setReadProgress(Math.min(100, (step / eventSequence.length) * 100));
        step++;
      } else {
        clearInterval(interval);
        setSimulating(false);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [simulating]);

  useEffect(() => {
    if (simulating) {
      const cleanup = simulateReader();
      return cleanup;
    }
  }, [simulating, simulateReader]);

  const resetDemo = () => {
    setActiveReader(DEMO_READERS[2]!);
    setEvents([]);
    setSimulating(false);
    setScoreHistory([]);
    setReadProgress(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Live Executive Demo</h1>
          <p className="text-sm text-slate-500 mt-1">Experience Tempo Reader Revenue Brain in action</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700">DEMO MODE</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left: Reader Selector + Scores */}
        <div className="space-y-4">
          {/* Reader Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-4">Select Demo Reader</h2>
            <div className="space-y-2">
              {DEMO_READERS.map((reader) => (
                <button
                  key={reader.id}
                  onClick={() => {
                    setActiveReader(reader);
                    setEvents([]);
                    setSimulating(false);
                    setReadProgress(0);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    activeReader.id === reader.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-slate-50 border border-transparent hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    activeReader.id === reader.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {reader.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{reader.name}</div>
                    <div className="text-xs text-slate-500">{reader.description}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      reader.expectedAction === 'SHOW_ANNUAL' ? 'bg-emerald-100 text-emerald-700' :
                      reader.expectedAction === 'SHOW_MONTHLY' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {reader.expectedAction.replace('SHOW_', '')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Revenue Brain Scores */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 p-5 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-sm">Revenue Brain Scores</span>
            </div>
            <div className="space-y-3 mb-4">
              <ScoreBar label="Engagement" value={activeReader.features.engagement_score} color="blue" />
              <ScoreBar label="Subscription Propensity" value={activeReader.features.subscription_propensity} color="emerald" />
              <ScoreBar label="Price Sensitivity" value={activeReader.features.price_sensitivity} color="amber" />
              <ScoreBar label="Content Loyalty" value={activeReader.features.content_loyalty} color="purple" />
              {activeReader.subscription_status === 'ACTIVE' && (
                <ScoreBar label="Churn Risk" value={activeReader.features.churn_risk} color="red" />
              )}
            </div>
            <div className="pt-3 border-t border-white/10">
              <div className="text-xs text-white/50">Estimated LTV</div>
              <div className="text-lg font-bold text-white">{formatRupiah(activeReader.features.predicted_ltv)}</div>
            </div>
          </div>

          {/* Simulate Button */}
          <button
            onClick={() => setSimulating(!simulating)}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors ${
              simulating
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {simulating ? (
              <><Pause className="w-4 h-4" /> Pause Simulation</>
            ) : (
              <><Play className="w-4 h-4" /> Simulate Reader Journey</>
            )}
          </button>

          <button onClick={resetDemo} className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            <RotateCcw className="w-4 h-4" /> Reset Demo
          </button>
        </div>

        {/* Center: Article Preview + Treatment */}
        <div className="xl:col-span-2 space-y-4">
          {/* Article Preview */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Article Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-tempo-red uppercase tracking-wider">{ARTICLE.category}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500">{ARTICLE.read_time}</span>
                {ARTICLE.is_premium && (
                  <>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">PREMIUM</span>
                  </>
                )}
              </div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{ARTICLE.title}</h1>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-6 h-6 rounded-full bg-slate-200" />
                <span className="text-sm text-slate-600">{ARTICLE.author}</span>
              </div>
            </div>

            {/* Reading Progress */}
            <div className="h-0.5 bg-slate-100">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${readProgress}%` }}
              />
            </div>

            {/* Article Body */}
            <div className="px-6 py-5">
              <div className="text-sm text-slate-700 leading-relaxed space-y-4">
                {ARTICLE.content.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>

            {/* Paywall Treatment */}
            {readProgress > 60 && (
              <div className="mx-6 mb-6 bg-gradient-to-br from-slate-50 to-blue-50 border border-blue-100 rounded-xl p-5 animate-fade-in">
                <div className="flex items-center gap-3 mb-3">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">Tempo Reader Revenue Brain Decision</span>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold border ${actionConfig.bg} ${actionConfig.color} ${actionConfig.border}`}>
                    {actionConfig.label}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <div className="w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${activeReader.expectedConfidence * 100}%` }} />
                    </div>
                    {Math.round(activeReader.expectedConfidence * 100)}% confidence
                  </div>
                </div>

                {reasons.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Why this decision?</div>
                    {reasons.map((reason) => (
                      <div key={reason} className="flex items-center gap-2 text-sm text-slate-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                        {reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Event Timeline */}
          {events.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" />
                Live Reader Journey
              </h3>
              <div className="space-y-2">
                {events.map((event, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm animate-fade-in">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      i === events.length - 1
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {i + 1}
                    </div>
                    <span className={i === events.length - 1 ? 'font-medium text-slate-900' : 'text-slate-500'}>
                      {event}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Decision Summary */}
        <div className="space-y-4">
          {/* Decision Result */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-4">Decision Result</h2>

            <div className={`inline-flex items-center px-4 py-2.5 rounded-xl text-base font-bold border-2 mb-4 ${actionConfig.bg} ${actionConfig.color} ${actionConfig.border}`}>
              {actionConfig.label}
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Confidence</span>
                <span className="font-semibold text-slate-900">{Math.round(activeReader.expectedConfidence * 100)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Reader Segment</span>
                <span className="font-medium text-slate-700">{activeReader.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <span className={`font-medium ${
                  activeReader.subscription_status === 'ACTIVE' ? 'text-emerald-600' :
                  activeReader.subscription_status === 'EXPIRED' ? 'text-red-600' :
                  'text-slate-600'
                }`}>
                  {activeReader.subscription_status === 'NONE' ? 'Non-subscriber' :
                   activeReader.subscription_status === 'ACTIVE' ? 'Active subscriber' :
                   activeReader.subscription_status === 'EXPIRED' ? 'Former subscriber' :
                   activeReader.subscription_status.toLowerCase()}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Why This Decision?</div>
              <div className="space-y-1.5">
                {reasons.map((reason) => (
                  <div key={reason} className="flex items-start gap-2 text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                    {reason}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Topic Affinity */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-4">Topic Affinity</h2>
            <div className="space-y-3">
              {Object.entries(activeReader.topic_affinity)
                .sort(([, a], [, b]) => b - a)
                .map(([topic, score]) => (
                  <div key={topic}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-700 font-medium">{topic}</span>
                      <span className="text-slate-500">{score}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Key Insight */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white">
            <TrendingUp className="w-5 h-5 mb-2 text-blue-200" />
            <div className="text-sm font-semibold mb-1">Revenue Insight</div>
            <div className="text-xs text-blue-200 leading-relaxed">
              {activeReader.id === 'demo_high_intent' && (
                'This reader has very high investigative content affinity and low price sensitivity. Annual subscription recommended to maximize LTV.'
              )}
              {activeReader.id === 'demo_engaged' && (
                'Medium-high propensity with price sensitivity. Monthly intro offer reduces friction and captures value immediately.'
              )}
              {activeReader.id === 'demo_casual' && (
                'Low propensity, high price sensitivity. Free access builds engagement before any monetization attempt.'
              )}
              {activeReader.id === 'demo_former' && (
                'Former subscriber with re-engagement signals. Winback offer leverages existing brand affinity.'
              )}
              {activeReader.id === 'demo_at_risk' && (
                'Active subscriber with declining engagement. Save offer prevents churn before renewal date.'
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
