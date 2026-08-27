// @ts-nocheck
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Zap, Brain, CheckCircle, ChevronRight, BookOpen, Clock, Target, User, X, AlertTriangle } from 'lucide-react';

// ── Journey ────────────────────────────────────────────────

const JOURNEY_STEPS = [
  {
    day: 1, label: 'Kunjungan Pertama',
    description: 'Andi menemukan Tempo dari Google, baca artikel gratis',
    action: 'ALLOW_FREE', confidence: 0.90,
    reasonCodes: ['NEW_READER', 'LOW_ENGAGEMENT'],
    meterPosition: [0, 3], lifecycleStage: 'NEW',
    events: ['session_start', 'page_view', 'article_view'],
    whatHappens: 'Revenue Brain mendeteksi pembaca baru. Meter artikel gratis = 0/3. Decision: ALLOW_FREE — beri akses gratis untuk bangun kesan pertama.',
    pitch: 'Selamat datang! Baca gratis 3 artikel premium pertama Anda.',
  },
  {
    day: 3, label: 'Kembali & Terlibat',
    description: 'Andi kembali, baca 2 artikel lagi',
    action: 'ALLOW_FREE', confidence: 0.88,
    reasonCodes: ['LOW_SUBSCRIPTION_PROPENSITY', 'MEDIUM_SUBSCRIPTION_PROPENSITY'],
    meterPosition: [2, 3], lifecycleStage: 'CASUAL',
    events: ['session_start', 'article_view', 'article_view', 'article_complete'],
    whatHappens: 'Engagement meningkat. Meter = 2/3. Andi masih dalam mode eksplorasi — belum siap subscribe tapi sudah menunjukkan minat. Decision: ALLOW_FREE.',
    pitch: 'Senang Anda kembali. Masih 1 artikel gratis tersisa.',
  },
  {
    day: 5, label: 'Artikel Premium Terakhir',
    description: 'Andi baca investigative report — artikel premium',
    action: 'SHOW_SOFT_PAYWALL', confidence: 0.88,
    reasonCodes: ['METER_EXHAUSTED', 'PREMIUM_ARTICLE'],
    meterPosition: [3, 3], lifecycleStage: 'HIGH_INTENT',
    events: ['session_start', 'article_view', 'scroll_50', 'paywall_view'],
    whatHappens: 'Meter = 3/3 — batas tercapai. Andi membaca investigative content yang punya conversion rate tertinggi. Revenue Brain: SHOW_SOFT_PAYWALL. Ini momen kritis!',
    pitch: '"Anda sudah membaca 3 artikel gratis. Subscribe Tempo+ Rp 64.000/bulan untuk akses tak terbatas."',
  },
  {
    day: 5, label: 'Andi Klik "Langganan"',
    description: 'Soft paywall muncul, Andi tertarik tapi belum checkout',
    action: 'SHOW_MONTHLY', confidence: 0.82,
    reasonCodes: ['HIGH_INTENT_READER', 'PREMIUM_CONTENT', 'HIGH_PROPENSITY'],
    meterPosition: [3, 3], lifecycleStage: 'HIGH_INTENT',
    events: ['paywall_click', 'subscription_offer_view'],
    whatHappens: 'Andi klik soft paywall, melihat offer Tempo+ Monthly. Revenue Brain mendeteksi investigative content affinity + high propensity → SHOW_MONTHLY dengan confidence 82%.',
    pitch: '"Tempo+ Monthly — Rp 64.000/bulan. Akses semua investigative report, analisis, dan konten eksklusif tanpa batas."',
  },
  {
    day: 6, label: 'Checkout Dimulai',
    description: 'Andi mulai checkout tapi ragu di halaman payment',
    action: 'SHOW_SAVE_OFFER', confidence: 0.78,
    reasonCodes: ['CHECKOUT_ABANDONMENT_RISK', 'HIGH_PROPENSITY'],
    meterPosition: [3, 3], lifecycleStage: 'CONVERTING',
    events: ['checkout_start', 'paywall_view'],
    whatHappens: 'Andi mulai checkout tapi ragu di halaman payment. Revenue Brain mendeteksi checkout abandon risk → SHOW_SAVE_OFFER sebagai intervensi last-chance sebelum drop-off.',
    pitch: '"Tunggu! Diskon 30% bulan pertama — hanya Rp 44.800. Jangan sampai kehilangan akses ke konten."',
  },
  {
    day: 6, label: 'Andi Subscribe!',
    description: 'Andi berhasil subscribe Tempo+ Monthly',
    action: 'NO_ACTION', confidence: 1.0,
    reasonCodes: ['ACTIVE_SUBSCRIBER'],
    meterPosition: null, lifecycleStage: 'SUBSCRIBED',
    events: ['subscription_success', 'conversion_recorded'],
    whatHappens: 'Conversion tercatat! Revenue Brain melakukan attribution — konversi ini attribution ke Investigative content. Andi sekarang SUBSCRIBED.',
    pitch: 'Selamat! Andi sekarang subscriber Tempo+. Revenue Brain berhasil mengkonversi pembaca engaged → subscriber.',
  },
];

const LIFECYCLE_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  NEW:        { bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-300' },
  CASUAL:     { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20' },
  HIGH_INTENT:{ bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20' },
  CONVERTING: { bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-200' },
  SUBSCRIBED: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20' },
};

const ACTION_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  ALLOW_FREE:        { bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-300' },
  SHOW_SOFT_PAYWALL: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20' },
  SHOW_MONTHLY:      { bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-200' },
  SHOW_SAVE_OFFER:   { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/20' },
  NO_ACTION:         { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20' },
};

const ACTION_LABELS: Record<string, string> = {
  ALLOW_FREE: 'Free Access', SHOW_SOFT_PAYWALL: 'Soft Paywall',
  SHOW_MONTHLY: 'Monthly Subscription', SHOW_SAVE_OFFER: 'Save Offer',
  NO_ACTION: 'Subscribed ✓',
};

const DEMO_ARTICLE = {
  title: 'Investigasi: compounds Korupsi dalam Proyek Infrastruktur Negara',
  category: 'Investigasi', author: 'Tim Investigasi Tempo', readTime: '12 min', isPremium: true,
};

function MeterDisplay({ current, limit }: { current: number; limit: number }) {
  const color = current >= limit ? 'bg-red-500' : current === limit - 1 ? 'bg-amber-500' : 'bg-blue-500';
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-slate-400">Meter:</span>
      {Array.from({ length: limit }).map((_, i) => (
        <div key={i} className={`w-2.5 h-2.5 rounded-full border transition-all ${i < current ? `${color} border-transparent` : 'bg-slate-100 border-slate-200'}`} />
      ))}
      <span className="text-[10px] font-mono text-slate-500 ml-1">{current}/{limit}</span>
    </div>
  );
}

const EVENT_COLORS: Record<string, string> = {
  subscription: '#22C55E', paywall: '#F59E0B', checkout: '#EF4444',
  article: '#3B82F6', session: '#8B5CF6', register: '#06B6D4', conversion: '#22C55E',
};

export default function DemoPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = JOURNEY_STEPS[activeStep]!;
  const isLast = activeStep === JOURNEY_STEPS.length - 1;
  const meterCurrent = step.meterPosition?.[0] ?? 0;
  const meterLimit = step.meterPosition?.[1] ?? 3;

  const playJourney = useCallback(() => { setPlaying(true); setShowResult(false); }, []);
  const pauseJourney = useCallback(() => {
    setPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);
  const resetJourney = useCallback(() => {
    setPlaying(false); setActiveStep(0); setShowResult(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (!playing) { if (timerRef.current) clearTimeout(timerRef.current); return; }
    if (activeStep >= JOURNEY_STEPS.length - 1) { setPlaying(false); setShowResult(true); return; }
    timerRef.current = setTimeout(() => setActiveStep(prev => prev + 1), 3200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, activeStep]);

  const lc = LIFECYCLE_CONFIG[step.lifecycleStage] ?? LIFECYCLE_CONFIG.NEW;
  const ac = ACTION_CONFIG[step.action] ?? ACTION_CONFIG.ALLOW_FREE;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-400/10 border border-emerald-400/20 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400">DEMO MODE</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[12px] font-bold text-slate-700">6-Hari Subscription Journey</h2>
          <span className="text-[10px] text-slate-300">Revenue Brain decisions</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {JOURNEY_STEPS.map((s, i) => {
            const isActive = i === activeStep;
            const isDone = i < activeStep;
            const sLc = LIFECYCLE_CONFIG[s.lifecycleStage] ?? LIFECYCLE_CONFIG.NEW;
            return (
              <button
                key={i}
                onClick={() => { setActiveStep(i); setPlaying(false); setShowResult(false); }}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  isActive ? 'bg-red-50 border-2 border-red-200' :
                  isDone ? 'bg-emerald-500/10 border border-emerald-500/20' :
                  'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black ${
                  isActive ? 'bg-red-600 text-slate-900' :
                  isDone ? 'bg-emerald-500 text-slate-900' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {isDone ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-[10px] text-slate-400">Day {s.day}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${sLc.bg} ${sLc.text}`}>
                  {s.lifecycleStage}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Left */}
        <div className="xl:col-span-2 space-y-4">

          {/* Step Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLast ? 'bg-emerald-500/15' : 'bg-red-50'}`}>
                  <Clock className={`w-4 h-4 ${isLast ? 'text-emerald-400' : 'text-red-500'}`} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-300">Day {step.day}</div>
                  <div className="text-[13px] font-bold text-slate-900">{step.label}</div>
                </div>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${lc.bg} ${lc.text} ${lc.border} border`}>
                {step.lifecycleStage}
              </span>
            </div>
            <p className="text-[12px] text-slate-400 leading-relaxed">{step.description}</p>
          </div>

          {/* Revenue Brain Decision */}
          <div className="bg-gradient-to-br from-[#0D0D1F] to-[#111128] border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-red-600" />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Revenue Brain Decision</span>
            </div>
            <span className={`inline-flex items-center px-4 py-2 rounded-xl text-[13px] font-black border mb-4 ${ac.bg} ${ac.text} ${ac.border}`}>
              {ACTION_LABELS[step.action] ?? step.action}
            </span>
            <div className="flex items-center gap-2 mb-4 text-[11px] text-slate-400">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-500 to-[#FF6B7A] rounded-full"
                  style={{ width: `${step.confidence * 100}%` }} />
              </div>
              <span className="font-mono font-bold text-slate-500">{Math.round(step.confidence * 100)}% confidence</span>
            </div>
            {step.meterPosition && <MeterDisplay current={meterCurrent} limit={meterLimit} />}
            {!step.meterPosition && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <span className="text-[12px] font-bold text-emerald-300">Subscription Active!</span>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="text-[9px] uppercase tracking-widest text-slate-300 mb-2">Reason Codes</div>
              <div className="flex flex-wrap gap-1.5">
                {step.reasonCodes.map((code) => (
                  <span key={code} className="text-[10px] px-2 py-1 bg-slate-50 rounded-full text-slate-400 border border-slate-200 font-mono">
                    {code.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {!playing && !isLast && (
              <button onClick={playJourney} className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 text-slate-900 rounded-xl text-[13px] font-bold hover:bg-[#B01028] transition-colors shadow-lg shadow-red-900/20">
                <Play className="w-4 h-4" /> Play Journey
              </button>
            )}
            {playing && (
              <button onClick={pauseJourney} className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 text-slate-900 rounded-xl text-[13px] font-bold hover:bg-amber-600 transition-colors">
                <Pause className="w-4 h-4" /> Pause
              </button>
            )}
            <button onClick={resetJourney} className="flex items-center justify-center gap-1.5 py-3 px-4 border border-slate-300 rounded-xl text-[12px] text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { if (activeStep > 0) setActiveStep(prev => prev - 1); }}
              disabled={activeStep === 0}
              className="flex-1 flex items-center justify-center gap-1 py-2 border border-slate-200 rounded-xl text-[12px] text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
              ← Previous
            </button>
            <button onClick={() => { if (!isLast) setActiveStep(prev => prev + 1); }}
              disabled={isLast}
              className="flex-1 flex items-center justify-center gap-1 py-2 border border-slate-200 rounded-xl text-[12px] text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
              Next →
            </button>
          </div>
        </div>

        {/* Right */}
        <div className="xl:col-span-3 space-y-4">

          {/* Article Preview */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">{DEMO_ARTICLE.category}</span>
                <span className="text-slate-300">·</span>
                <span className="text-[10px] text-slate-300">{DEMO_ARTICLE.readTime}</span>
                <span className="text-slate-300">·</span>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">PREMIUM</span>
                {step.meterPosition && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20">
                      {meterCurrent}/3 free
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-[16px] font-black text-slate-900 leading-tight">{DEMO_ARTICLE.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-6 h-6 rounded-full bg-slate-100" />
                <span className="text-[12px] text-slate-400">{DEMO_ARTICLE.author}</span>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="text-[12px] text-slate-400 leading-relaxed space-y-3">
                <p>Surat dari dokumen yang diperoleh Tempo menunjukkan bahwa sebagian besar anggaran proyek dialihkan ke rekening pribadi melalui jaringan perusahaan cangkang...</p>
                <p>"Ini adalah salah satu kasus korupsi terbesar yang pernah kami dokumentasikan," kata seorang investigator...</p>
              </div>
            </div>

            {/* Paywall Treatment */}
            {activeStep >= 2 && (
              <div className="mx-6 mb-5 bg-gradient-to-br from-[#0D0D1F] to-[#111128] border border-red-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-red-600" />
                  <span className="text-[12px] font-bold text-slate-600">Tempo+ Offer</span>
                  <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-md font-bold ${ac.bg} ${ac.text} border ${ac.border}`}>
                    {ACTION_LABELS[step.action]}
                  </span>
                </div>
                {step.action !== 'ALLOW_FREE' && step.action !== 'NO_ACTION' && (
                  <div className="flex items-center gap-3 mb-3 text-[11px] text-slate-400">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> Akses tak terbatas investigative report
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> Tanpa batas waktu
                  </div>
                )}
                {step.action === 'SHOW_SAVE_OFFER' && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">
                    <span className="text-[13px] font-black text-red-400">Diskon 30% bulan pertama — Rp 44.800!</span>
                  </div>
                )}
                {step.action === 'SHOW_MONTHLY' && (
                  <div className="text-[18px] font-black text-slate-900 mb-1">Rp 64.000<span className="text-[12px] font-normal text-slate-400">/bulan</span></div>
                )}
                {step.action === 'ALLOW_FREE' && (
                  <div className="text-[12px] text-slate-400">
                    Masih <span className="font-bold text-blue-400">{3 - meterCurrent}</span> artikel gratis tersisa.
                  </div>
                )}
                <div className="text-[11px] text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 italic">
                  "{step.pitch}"
                </div>
              </div>
            )}
          </div>

          {/* Event Log */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="text-[11px] font-bold text-slate-500 mb-3 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              Event Log — Day {step.day}
            </h3>
            <div className="space-y-1.5">
              {step.events.map((event, i) => {
                const colorKey = event.split('_')[0];
                return (
                  <div key={i} className="flex items-center gap-2.5 text-[11px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: EVENT_COLORS[colorKey] ?? '#6B7280' }} />
                    <code className="font-mono text-slate-500">{event}</code>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Attribution Result */}
          {showResult && (
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
                <h3 className="text-[16px] font-black text-emerald-300">Konversi Berhasil!</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  ['Attribution Source', 'Investigative Content'],
                  ['Revenue', 'Rp 64.000/bulan'],
                  ['Lifecycle', 'SUBSCRIBED'],
                  ['Days to Convert', '6 days'],
                ].map(([label, value]) => (
                  <div key={String(label)} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <div className="text-[9px] text-emerald-400/60 uppercase tracking-widest mb-1">{label}</div>
                    <div className="text-[13px] font-bold text-slate-800">{String(value)}</div>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-slate-400 leading-relaxed">
                Revenue Brain successfully converted Andi from <strong className="text-slate-600">NEW</strong> → <strong className="text-emerald-400">SUBSCRIBED</strong> in 6 days. The investigative content paywall on Day 5 triggered conversion, with save-offer intervention on Day 6 preventing checkout abandonment.
              </p>
            </div>
          )}

          {/* What Happens */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="text-[11px] font-bold text-slate-500 mb-2 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Apa yang Terjadi?
            </h3>
            <p className="text-[12px] text-slate-400 leading-relaxed">{step.whatHappens}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
