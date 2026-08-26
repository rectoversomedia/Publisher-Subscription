'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, Zap, Brain, CheckCircle, X, ChevronRight, BookOpen, Clock, TrendingUp, Target, User } from 'lucide-react';

// ── 6-Day Subscription Journey: Andi the Tempo Reader ────────

const JOURNEY_STEPS = [
  {
    day: 1,
    label: 'Kunjungan Pertama',
    description: 'Andi menemukan Tempo dari Google, baca artikel gratis',
    action: 'ALLOW_FREE',
    confidence: 0.9,
    reasonCodes: ['NEW_READER', 'LOW_ENGAGEMENT'],
    meterPosition: [0, 3],
    lifecycleStage: 'NEW',
    events: ['session_start', 'page_view', 'article_view'],
    whatHappens: 'Revenue Brain mendeteksi pembaca baru. Meter artikel gratis = 0/3. Decision: ALLOW_FREE — beri akses gratis untuk bangun kesan pertama.',
    pitch: 'Selamat datang! Baca gratis 3 artikel premium pertama Anda.',
  },
  {
    day: 3,
    label: 'Kembali & Terlibat',
    description: 'Andi kembali, baca 2 artikel lagi',
    action: 'ALLOW_FREE',
    confidence: 0.88,
    reasonCodes: ['LOW_SUBSCRIPTION_PROPENSITY', 'MEDIUM_SUBSCRIPTION_PROPENSITY'],
    meterPosition: [2, 3],
    lifecycleStage: 'CASUAL',
    events: ['session_start', 'article_view', 'article_view', 'article_complete'],
    whatHappens: 'Engagement meningkat. Meter = 2/3. Andi masih dalam mode eksplorasi — belum siap subscribe tapi sudah menunjukkan minat. Decision: ALLOW_FREE.',
    pitch: 'Senang Anda kembali. Masih 1 artikel gratis tersisa.',
  },
  {
    day: 5,
    label: 'Artikel Premium Terakhir',
    description: 'Andi baca investigative report — artikel premium',
    action: 'SHOW_SOFT_PAYWALL',
    confidence: 0.88,
    reasonCodes: ['METER_NEARLY_EXHAUSTED', 'PREMIUM_ARTICLE'],
    meterPosition: [3, 3],
    lifecycleStage: 'HIGH_INTENT',
    events: ['session_start', 'article_view', 'scroll_50', 'paywall_view'],
    whatHappens: 'Meter = 3/3 — batas tercapai. Andi membaca investigative content yang punya conversion rate tertinggi. Revenue Brain: SHOW_SOFT_PAYWALL. Ini momen kritis!',
    pitch: '"Anda sudah membaca 3 artikel gratis. Subscribe Tempo+ Rp 64.000/bulan untuk akses tak terbatas ke seluruh investigative report."',
  },
  {
    day: 5,
    label: 'Andi Klik "Langganan"',
    description: 'Soft paywall muncul, Andi tertarik tapi belum checkout',
    action: 'SHOW_MONTHLY',
    confidence: 0.82,
    reasonCodes: ['LIFECYCLE_HIGH_INTENT', 'HIGH_SUBSCRIPTION_PROPENSITY', 'INVESTIGATIVE_CONTENT'],
    meterPosition: [3, 3],
    lifecycleStage: 'HIGH_INTENT',
    events: ['paywall_click', 'subscription_offer_view'],
    whatHappens: 'Andi klik soft paywall, melihat offer Tempo+ Monthly. Revenue Brain mendeteksi investigative content affinity + high propensity → SHOW_MONTHLY dengan confidence 82%.',
    pitch: '"Tempo+ Monthly — Rp 64.000/bulan. Akses semua investigative report, analisis, dan konten eksklusif tanpa batas."',
  },
  {
    day: 6,
    label: 'Checkout Dimulai',
    description: 'Andi mulai checkout tapi ragu di halaman payment',
    action: 'SHOW_SAVE_OFFER',
    confidence: 0.78,
    reasonCodes: ['RECENT_CHECKOUT_ABANDONMENT', 'HIGH_SUBSCRIPTION_PROPENSITY'],
    meterPosition: [3, 3],
    lifecycleStage: 'CONVERTING',
    events: ['checkout_start', 'paywall_view'],
    whatHappens: 'Andi mulai checkout tapi ragu di halaman payment. Revenue Brain mendeteksi checkout abandon risk → SHOW_SAVE_OFFER sebagai intervensi last-chance sebelum drop-off.',
    pitch: '"Tunggu! Kami kasih diskon 30% bulan pertama — hanya Rp 44.800. Jangan sampai kehilangan akses ke konten yang sudah Anda andalkan."',
  },
  {
    day: 6,
    label: 'Andi Subscribe!',
    description: 'Andi berhasil subscribe Tempo+ Monthly',
    action: 'NO_ACTION',
    confidence: 1.0,
    reasonCodes: ['ACTIVE_SUBSCRIBER'],
    meterPosition: null,
    lifecycleStage: 'SUBSCRIBED',
    events: ['subscription_success', 'conversion_recorded'],
    whatHappens: 'Conversion tercatat! Revenue Brain melakukan attribution — konversi ini attribution ke Investigative content, session terakhir dari paywall click. Andi sekarang SUBSCRIBED.',
    pitch: 'Selamat! Andi sekarang subscriber Tempo+. Revenue Brain berhasil mengkonversi pembaca engaged → subscriber.',
  },
];

const METERING_BG = {
  0: { bg: 'bg-slate-50',  border: 'border-slate-200', text: 'text-slate-600' },
  1: { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-600' },
  2: { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-600' },
  3: { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-600' },
};

const LIFECYCLE_COLORS: Record<string, { bg: string; text: string }> = {
  NEW:        { bg: 'bg-slate-100', text: 'text-slate-600' },
  CASUAL:     { bg: 'bg-blue-50',  text: 'text-blue-600'  },
  HIGH_INTENT:{ bg: 'bg-amber-50',  text: 'text-amber-600'  },
  CONVERTING: { bg: 'bg-orange-50',text: 'text-orange-600' },
  SUBSCRIBED: { bg: 'bg-emerald-50',text:'text-emerald-600' },
};

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ALLOW_FREE:     { bg: 'bg-slate-50',   text: 'text-slate-700',  border: 'border-slate-200' },
  SHOW_SOFT_PAYWALL: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  SHOW_MONTHLY:   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  SHOW_SAVE_OFFER:{ bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  NO_ACTION:      { bg: 'bg-slate-50',   text: 'text-slate-500',  border: 'border-slate-200' },
};

const ACTION_LABELS: Record<string, string> = {
  ALLOW_FREE: 'Free Access',
  SHOW_SOFT_PAYWALL: 'Soft Paywall',
  SHOW_MONTHLY: 'Monthly Subscription',
  SHOW_SAVE_OFFER: 'Save Offer',
  NO_ACTION: 'No Action (Subscribed)',
};

// ── Demo Article ──────────────────────────────────────────────

const DEMO_ARTICLE = {
  title: 'Investigasi: compounds Korupsi dalam Proyek Infrastruktur Negara',
  category: 'Investigasi',
  author: 'Tim Investigasi Tempo',
  readTime: '12 min',
  isPremium: true,
};

// ── Score Bars ───────────────────────────────────────────────

function ScoreBar({ label, value, color = 'blue' }: { label: string; value: number; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500', emerald: 'bg-emerald-500',
    amber: 'bg-amber-500', red: 'bg-red-500', purple: 'bg-purple-500',
  };
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-white/60">{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${colors[color]} rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

// ── Meter Display ────────────────────────────────────────────

function MeterDisplay({ current, limit, compact = false }: { current: number; limit: number; compact?: boolean }) {
  const pct = Math.round((current / limit) * 100);
  const color = current >= limit ? 'red' : current === limit - 1 ? 'amber' : 'blue';
  const colors: Record<string, string> = { red: 'bg-red-500', amber: 'bg-amber-500', blue: 'bg-blue-500' };
  const dotColors: Record<string, string> = { red: 'bg-red-400', amber: 'bg-amber-400', blue: 'bg-blue-400' };

  return (
    <div className={`${compact ? 'flex items-center gap-2' : 'bg-white/5 rounded-xl p-3'}`}>
      <div className="text-xs text-white/40 mb-1">{compact ? 'Meter' : 'Free Article Meter'}</div>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: limit }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full border transition-all ${
              i < current
                ? `${colors[color]} border-transparent`
                : 'bg-white/10 border-white/20'
            }`}
          />
        ))}
        <span className="text-xs font-semibold text-white ml-1">{current}/{limit}</span>
      </div>
      {!compact && (
        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className={`h-full ${colors[color]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

// ── Main Demo Component ────────────────────────────────────────

export default function DemoPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = JOURNEY_STEPS[activeStep]!;
  const prevStep = activeStep > 0 ? JOURNEY_STEPS[activeStep - 1] : null;
  const isLast = activeStep === JOURNEY_STEPS.length - 1;
  const meterCurrent = step.meterPosition?.[0] ?? 0;
  const meterLimit = step.meterPosition?.[1] ?? 3;

  const playJourney = useCallback(() => {
    setPlaying(true);
    setShowResult(false);
  }, []);

  const pauseJourney = useCallback(() => {
    setPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const resetJourney = useCallback(() => {
    setPlaying(false);
    setActiveStep(0);
    setShowResult(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    if (activeStep >= JOURNEY_STEPS.length - 1) {
      setPlaying(false);
      setShowResult(true);
      return;
    }
    timerRef.current = setTimeout(() => {
      setActiveStep(prev => prev + 1);
    }, 3200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, activeStep]);

  const lifecycleColors = LIFECYCLE_COLORS[step.lifecycleStage] ?? LIFECYCLE_COLORS.NEW;
  const actionColors = ACTION_COLORS[step.action] ?? ACTION_COLORS.ALLOW_FREE;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Demo: 6-Hari Journey ke Subscription</h1>
          <p className="text-sm text-slate-500 mt-1">Ikuti perjalanan "Andi" — dari pembaca baru → subscriber Tempo+</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700">DEMO MODE</span>
          </div>
        </div>
      </div>

      {/* Day Progress Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 text-sm">6-Hari Subscription Journey</h2>
          <span className="text-xs text-slate-400">Revenue Brain decisions</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {JOURNEY_STEPS.map((s, i) => {
            const lc = LIFECYCLE_COLORS[s.lifecycleStage] ?? LIFECYCLE_COLORS.NEW;
            const isActive = i === activeStep;
            const isDone = i < activeStep;
            return (
              <button
                key={i}
                onClick={() => { setActiveStep(i); setPlaying(false); setShowResult(false); }}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                  isActive ? 'bg-blue-50 border-2 border-blue-400 ring-2 ring-blue-100' :
                  isDone ? 'bg-emerald-50 border border-emerald-200' :
                  'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  isActive ? 'bg-blue-600 text-white' :
                  isDone ? 'bg-emerald-500 text-white' :
                  'bg-slate-200 text-slate-600'
                }`}>
                  {isDone ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-xs font-medium text-slate-700">Day {s.day}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${lc!.bg} ${lc!.text} font-medium`}>
                  {s.lifecycleStage}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left: Step Detail */}
        <div className="xl:col-span-2 space-y-4">
          {/* Step Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  isLast ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Day {step.day}</div>
                  <div className="font-semibold text-slate-900 text-sm">{step.label}</div>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${lifecycleColors!.bg} ${lifecycleColors!.text}`}>
                {step.lifecycleStage}
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
          </div>

          {/* Revenue Brain Decision */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 p-5 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-blue-400" />
              <span className="font-semibold text-sm">Revenue Brain Decision</span>
            </div>

            <div className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold border mb-4 ${actionColors!.bg} ${actionColors!.text} ${actionColors!.border}`}>
              {ACTION_LABELS[step.action] ?? step.action}
            </div>

            <div className="flex items-center gap-2 mb-4 text-xs text-white/60">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${step.confidence * 100}%` }} />
              </div>
              <span className="font-semibold text-white">{Math.round(step.confidence * 100)}% confidence</span>
            </div>

            {step.meterPosition && (
              <MeterDisplay current={meterCurrent} limit={meterLimit} />
            )}

            {!step.meterPosition && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <span className="text-sm font-semibold text-emerald-300">Subscription Active!</span>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="text-xs text-white/40 uppercase tracking-wide font-semibold mb-2">Reason Codes</div>
              <div className="flex flex-wrap gap-1.5">
                {step.reasonCodes.map((code) => (
                  <span key={code} className="text-[10px] px-2 py-1 bg-white/10 rounded-full text-white/70">
                    {code.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {!playing && !isLast ? (
              <button onClick={playJourney} className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
                <Play className="w-4 h-4" /> Play Journey
              </button>
            ) : playing ? (
              <button onClick={pauseJourney} className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600">
                <Pause className="w-4 h-4" /> Pause
              </button>
            ) : null}
            <button onClick={resetJourney} className="flex items-center justify-center gap-1.5 py-3 px-4 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>

          {/* Navigation arrows */}
          <div className="flex gap-2">
            <button
              onClick={() => { if (activeStep > 0) setActiveStep(prev => prev - 1); }}
              disabled={activeStep === 0}
              className="flex-1 flex items-center justify-center gap-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              onClick={() => { if (!isLast) setActiveStep(prev => prev + 1); }}
              disabled={isLast}
              className="flex-1 flex items-center justify-center gap-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Center: Article + Paywall */}
        <div className="xl:col-span-3 space-y-4">
          {/* Article Preview */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">{DEMO_ARTICLE.category}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500">{DEMO_ARTICLE.readTime}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">PREMIUM</span>
                {step.meterPosition && (
                  <>
                    <span className="text-xs text-slate-400">·</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                      (METERING_BG as Record<number, {bg: string; text: string}>)[meterCurrent]?.bg ?? 'bg-slate-50'
                    } ${(METERING_BG as Record<number, {bg: string; text: string}>)[meterCurrent]?.text ?? 'text-slate-600'}`}>
                      {meterCurrent}/3 free
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{DEMO_ARTICLE.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-6 h-6 rounded-full bg-slate-200" />
                <span className="text-sm text-slate-600">{DEMO_ARTICLE.author}</span>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="text-sm text-slate-700 leading-relaxed space-y-3">
                <p>Surat dari dokumen yang diperoleh Tempo menunjukkan bahwa sebagian besar anggaran proyek dialihkan ke rekening pribadi melalui jaringan perusahaan cangkang...</p>
                <p>"Ini adalah salah satu kasus korupsi terbesar yang pernah kami dokumentasikan," kata seorang investigator yang menolak disebutkan namanya...</p>
              </div>
            </div>

            {/* Paywall Treatment for steps 2+ */}
            {activeStep >= 2 && (
              <div className="mx-6 mb-5 bg-gradient-to-br from-slate-50 to-blue-50 border border-blue-100 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">Tempo+ Offer</span>
                </div>
            <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold border mb-3 ${actionColors!.bg} ${actionColors!.text} ${actionColors!.border}`}>
                  {ACTION_LABELS[step.action] ?? step.action}
                </div>
                {step.action !== 'ALLOW_FREE' && step.action !== 'NO_ACTION' && (
                  <div className="flex items-center gap-4 mb-3">
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Akses tak terbatas investigative report
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Tanpa batas waktu
                    </div>
                  </div>
                )}
                {step.action === 'SHOW_SAVE_OFFER' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                    <span className="text-sm font-bold text-red-700">Diskon 30% bulan pertama — Rp 44.800!</span>
                  </div>
                )}
                {step.action === 'SHOW_MONTHLY' && (
                  <div className="text-base font-bold text-slate-900 mb-1">Rp 64.000<span className="text-sm font-normal text-slate-500">/bulan</span></div>
                )}
                {step.action === 'ALLOW_FREE' && (
                  <div className="text-sm text-slate-600">
                    Masih <span className="font-bold text-blue-600">{3 - (step.meterPosition?.[0] ?? 0)}</span> artikel gratis tersisa.
                  </div>
                )}
                <div className="text-xs text-blue-700 bg-blue-100 rounded-lg px-3 py-2 italic">
                  "{step.pitch}"
                </div>
              </div>
            )}
          </div>

          {/* Event Log */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              Event Log — Day {step.day}
            </h3>
            <div className="space-y-1.5">
              {step.events.map((event, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    event.includes('subscription') || event.includes('conversion') ? 'bg-emerald-500' :
                    event.includes('paywall') ? 'bg-amber-500' :
                    event.includes('checkout') ? 'bg-red-500' :
                    'bg-blue-400'
                  }`} />
                  <code className="font-mono text-slate-700">{event}</code>
                </div>
              ))}
            </div>
          </div>

          {/* Attribution Result */}
          {showResult && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                <h3 className="font-bold text-emerald-900 text-lg">Konversi Berhasil!</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/80 rounded-lg p-3">
                  <div className="text-xs text-emerald-600 mb-1">Attribution Source</div>
                  <div className="font-semibold text-slate-900 text-sm">{DEMO_ARTICLE.category} Content</div>
                </div>
                <div className="bg-white/80 rounded-lg p-3">
                  <div className="text-xs text-emerald-600 mb-1">Revenue</div>
                  <div className="font-semibold text-slate-900 text-sm">Rp 64.000/bulan</div>
                </div>
                <div className="bg-white/80 rounded-lg p-3">
                  <div className="text-xs text-emerald-600 mb-1">Lifecycle</div>
                  <div className="font-semibold text-slate-900 text-sm">SUBSCRIBED</div>
                </div>
                <div className="bg-white/80 rounded-lg p-3">
                  <div className="text-xs text-emerald-600 mb-1">Days to Convert</div>
                  <div className="font-semibold text-slate-900 text-sm">6 days</div>
                </div>
              </div>
              <p className="text-sm text-emerald-800 leading-relaxed">
                Revenue Brain successfully converted Andi from <strong>NEW</strong> → <strong>SUBSCRIBED</strong> in 6 days.
                The key trigger was the investigative content paywall on Day 5, with save-offer intervention on Day 6 preventing checkout abandonment.
              </p>
            </div>
          )}

          {/* What Happens Now */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              Apa yang Terjadi?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">{step.whatHappens}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
