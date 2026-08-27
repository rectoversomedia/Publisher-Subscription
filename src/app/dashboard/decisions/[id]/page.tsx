// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Activity, Brain, Clock, User, FlaskConical, ChevronRight, Zap, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react';

interface DecisionDetail {
  id: string;
  reader_id: string;
  timestamp: string;
  selected_action: string;
  confidence: number;
  reason_codes: string[];
  score_snapshot: Record<string, number>;
  execution_mode: string;
  experiment_id: string | null;
  selected_offer_id: string | null;
  decision_version: string;
  expected_value: number | null;
  latency_ms: number | null;
  readers?: {
    anonymous_id?: string;
    external_user_id?: string;
    subscription_status: string;
    identity_status: string;
  };
  reader_features?: {
    lifecycle_stage?: string;
    free_articles_read?: number;
    paywall_meter_reset_at?: string;
    engagement_score?: number;
    subscription_propensity?: number;
    churn_risk?: number;
  };
  context?: Record<string, unknown>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function fmt(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  ALLOW_FREE: { label: 'Akses Gratis', color: 'bg-slate-100 text-slate-600' },
  SHOW_REGISTRATION: { label: 'Dinding Registrasi', color: 'bg-blue-500/15 text-blue-400' },
  SHOW_NEWSLETTER_GATE: { label: 'Gerbang Newsletter', color: 'bg-purple-500/15 text-purple-400' },
  SHOW_MONTHLY: { label: 'Langganan Bulanan', color: 'bg-emerald-500/15 text-emerald-400' },
  SHOW_ANNUAL: { label: 'Langganan Tahunan', color: 'bg-emerald-500/10 text-emerald-300' },
  SHOW_TRIAL: { label: 'Coba Gratis', color: 'bg-amber-500/15 text-amber-400' },
  SHOW_SAVE_OFFER: { label: 'Tawar Selamatkan', color: 'bg-red-50 text-red-500' },
  SHOW_WINBACK: { label: 'Tawar Kembali', color: 'bg-orange-500/15 text-orange-400' },
  NO_ACTION: { label: 'Tidak Ada Aksi', color: 'bg-slate-50 text-slate-400' },
};

const REASON_LABELS: Record<string, string> = {
  HIGH_PROPENSITY: 'Propensity langganan tinggi',
  MEDIUM_PROPENSITY: 'Propensity langganan sedang',
  LOW_PROPENSITY: 'Propensity langganan rendah',
  NEW_READER: 'Pembaca baru — belum ada history',
  RETURNING_READER: 'Pembaca kembali',
  ACTIVE_SUBSCRIBER: 'Subscriber aktif',
  HIGH_CHURN_RISK: 'Signal risiko churn tinggi',
  LOW_CHURN_RISK: 'Risiko churn rendah',
  INVESTIGATIVE_CONTENT: 'Membaca jurnalisme investigasi',
  LOW_PRICE_SENSITIVITY: 'Kurang sensitif harga',
  HIGH_PRICE_SENSITIVITY: 'Sangat sensitif harga',
  HIGH_ENGAGEMENT: 'Signal engagement tinggi',
  LOW_ENGAGEMENT_7D: 'Engagement rendah (7 hari)',
  HIGH_CONTENT_LOYALTY: 'Loyalitas konten tinggi',
  REGISTERED_READER: 'Pembaca terdaftar',
  ANONYMOUS_READER: 'Pembaca anonim',
  FORMER_SUBSCRIBER: 'Mantan subscriber',
  RE_ENGAGEMENT: 'Kandidat re-engagement',
  WINBACK_CANDIDATE: 'Kandidat winback',
};

export default function DecisionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [decision, setDecision] = useState<DecisionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/v1/decisions?limit=200`)
      .then((r) => r.json())
      .then(async (d) => {
        const found = (d.data ?? []).find((dec: DecisionDetail) => dec.id === id);
        if (found) {
          setDecision(found);
          // Also load reader features for lifecycle/metering display
          if (found.reader_id) {
            try {
              const featRes = await fetch(`/api/v1/readers/${found.reader_id}`);
              if (featRes.ok) {
                const featData = await featRes.json();
                if (featData.features) {
                  setDecision(prev => prev ? { ...prev, reader_features: featData.features } : prev);
                }
              }
            } catch { /* non-critical */ }
          }
        } else {
          setError('Decision not found');
        }
        setLoading(false);
      })
      .catch(() => { setError('Failed to load'); setLoading(false); });
  }, [id]);

  if (loading) return <div className="py-20 text-center text-slate-400">Memuat keputusan…</div>;
  if (error || !decision) return <div className="py-20 text-center text-slate-400">{error ?? 'Keputusan tidak ditemukan'}</div>;

  const action = ACTION_LABELS[decision.selected_action] ?? { label: decision.selected_action, color: 'bg-slate-100 text-slate-600' };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/decisions" className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50">
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Detail Keputusan</h1>
          <p className="text-xs text-slate-400 font-mono">{id}</p>
        </div>
      </div>

      {/* Decision Summary Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-slate-400" />
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${action.color}`}>
              {action.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            {timeAgo(decision.timestamp)}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-slate-400 mb-1">Tingkat Kepercayaan</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(decision.confidence ?? 0) * 100}%` }}
                />
              </div>
              <span className="text-sm font-semibold">{Math.round((decision.confidence ?? 0) * 100)}%</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Mode Eksekusi</div>
            <span className={`text-sm font-medium ${decision.execution_mode === 'LIVE' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {decision.execution_mode}
            </span>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Versi Keputusan</div>
            <span className="text-sm font-medium text-slate-600">{decision.decision_version ?? '—'}</span>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Nilai Estimasi</div>
            <span className="text-sm font-medium text-slate-600">
              {decision.expected_value != null ? fmt(decision.expected_value) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Kode Alasan */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Kode Alasan
        </h2>
        <div className="flex flex-wrap gap-2">
          {(decision.reason_codes ?? []).map((code) => (
            <span key={code} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-full text-xs text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              {REASON_LABELS[code] ?? code.replace(/_/g, ' ').toLowerCase()}
            </span>
          ))}
          {(!decision.reason_codes || decision.reason_codes.length === 0) && (
            <span className="text-xs text-slate-400">Tidak ada kode alasan tercatat</span>
          )}
        </div>
      </div>

      {/* Lifecycle Stage + Metering */}
      {decision.reader_features && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Tahap Siklus Hidup & Meter
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Lifecycle Stage */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                decision.reader_features.lifecycle_stage === 'SUBSCRIBED' ? 'bg-emerald-500/15 text-emerald-400' :
                decision.reader_features.lifecycle_stage === 'AT_RISK' ? 'bg-red-50 text-red-500' :
                decision.reader_features.lifecycle_stage === 'HIGH_INTENT' ? 'bg-amber-500/15 text-amber-400' :
                decision.reader_features.lifecycle_stage === 'CONVERTING' ? 'bg-orange-500/15 text-orange-400' :
                decision.reader_features.lifecycle_stage === 'WINBACK' ? 'bg-purple-500/15 text-purple-400' :
                'bg-blue-500/15 text-blue-400'
              }`}>
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Tahap Siklus</div>
                <div className="text-sm font-bold text-slate-800">
                  {decision.reader_features.lifecycle_stage ?? 'Unknown'}
                </div>
              </div>
            </div>

            {/* Meter Position */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-slate-400 mb-1">Free Article Meter</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (decision.reader_features.free_articles_read ?? 0) >= 3
                          ? 'bg-red-500'
                          : (decision.reader_features.free_articles_read ?? 0) >= 2
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, ((decision.reader_features.free_articles_read ?? 0) / 3) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-600">
                    {decision.reader_features.free_articles_read ?? 0}/3
                  </span>
                </div>
              </div>
            </div>

            {/* Risk Signals */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                (decision.reader_features.churn_risk ?? 0) >= 70 ? 'bg-red-50 text-red-500' :
                (decision.reader_features.churn_risk ?? 0) >= 40 ? 'bg-amber-500/15 text-amber-400' :
                'bg-emerald-500/15 text-emerald-400'
              }`}>
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Risk Signal</div>
                <div className={`text-sm font-bold ${
                  (decision.reader_features.churn_risk ?? 0) >= 70 ? 'text-red-400' :
                  (decision.reader_features.churn_risk ?? 0) >= 40 ? 'text-amber-400' :
                  'text-emerald-400'
                }`}>
                  {(decision.reader_features.churn_risk ?? 0) >= 70 ? 'High Risk' :
                   (decision.reader_features.churn_risk ?? 0) >= 40 ? 'Medium Risk' :
                   'Low Risk'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Penjelasan Bisnis */}
      <div className="bg-gradient-to-br from-[#111128] to-[#0D0D1F] rounded-xl border border-slate-300 p-6 text-slate-900">
        <div className="flex items-center gap-2 mb-5">
          <Brain className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold text-slate-900">Penjelasan Bisnis</h2>
        </div>

        {/* Summary */}
        <div className="mb-5">
          <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">Summary</div>
          <p className="text-sm text-slate-900 leading-relaxed">
            {decision.selected_action === 'SHOW_HARD_PAYWALL' && (decision.reader_features?.free_articles_read ?? 0) >= 3 && (
              `Pembaca sudah membaca ${decision.reader_features?.free_articles_read ?? 0} dari 3 artikel gratis. Batas article limit sudah tercapai — pembaca harus subscribe ke Tempo+ untuk akses artikel premium.`
            )}
            {decision.selected_action === 'SHOW_SOFT_PAYWALL' && (
              `Pembaca sudah membaca ${decision.reader_features?.free_articles_read ?? 0} dari 3 artikel gratis. Tampilkan soft paywall sebagai peringatan —文章的 berikutnya akan kena hard paywall.`
            )}
            {decision.selected_action === 'SHOW_MONTHLY' && (
              `Pembaca di tahap ${decision.reader_features?.lifecycle_stage ?? 'ENGAGED'} dengan subscription propensity tinggi. Tawarkan Tempo+ Monthly — Rp 64.000/bulan — pitch akses tak terbatas ke seluruh konten premium.`
            )}
            {decision.selected_action === 'SHOW_ANNUAL' && (
              `Pembaca sangat engaged dan sudah siap untuk komitmen jangka panjang. Tawarkan Tempo+ Annual — paket terbaik untuk pembaca setia investigative journalism.`
            )}
            {decision.selected_action === 'SHOW_SAVE_OFFER' && (
              `Pembaca aktif dengan churn risk ${decision.reader_features?.churn_risk ?? 0}. Tan-pa intervensi, churn dalam 14 hari sangat mungkin. Kirim save offer SEKARANG.`
            )}
            {decision.selected_action === 'SHOW_WINBACK' && (
              `Mantan pelanggan Tempo+ terdeteksi dengan engagement tinggi. Mereka sudah tahu value produk — winback offer memiliki conversion rate lebih tinggi dari acquisition baru.`
            )}
            {decision.selected_action === 'ALLOW_FREE' && (
              `Pembaca masih di tahap awal journey (${decision.reader_features?.lifecycle_stage ?? 'NEW'}). Biarkan gratis sambil terus membangun engagement sebelum monetize.`
            )}
            {decision.selected_action === 'NO_ACTION' && (
              `Pembaca sudah aktif subscribe Tempo+. Tidak perlu intervensi — fokus ke churn prevention jika churn risk meningkat.`
            )}
            {['SHOW_REGISTRATION', 'SHOW_NEWSLETTER_GATE', 'SHOW_TRIAL', 'SHOW_DAY_PASS', 'SHOW_BUNDLE', 'SHOW_VIP', 'SHOW_RENEWAL', 'SHOW_RETENTION_CONTENT'].includes(decision.selected_action) && (
              `Revenue Brain merekomendasikan ${decision.selected_action.replace(/_/g, ' ').toLowerCase()} untuk pembaca di tahap ${decision.reader_features?.lifecycle_stage ?? 'UNKNOWN'}.`
            )}
          </p>
        </div>

        {/* Why Now + Apa yang Harus Di katakan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Kenapa Sekarang?</div>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed">
              {decision.reason_codes?.includes('METER_EXHAUSTED') && (
                `Batas artikel gratis sudah tercapai. Momen kritis untuk lock conversion sebelum mereka pergi.`
              )}
              {decision.reason_codes?.includes('METER_NEARLY_EXHAUSTED') && (
                `Artikel terakhir gratis — next akan kena hard paywall. Jendela terakhir untuk soft conversion.`
              )}
              {decision.reason_codes?.includes('LIFECYCLE_CONVERTING') && (
                `Pembaca sudah berinteraksi paywall berkali-kali tanpa convert. Momentum harus ditangkap SEKARANG.`
              )}
              {decision.reason_codes?.includes('HIGH_CHURN_RISK') && (
                `Churn risk meningkat. Tanpa save offer, kemungkinan churn dalam 30 hari sangat tinggi.`
              )}
              {decision.reason_codes?.includes('FORMER_SUBSCRIBER') && (
                `Mantan pelanggan terdeteksi. Mereka sudah tahu value Tempo+ — winback effort paling efektif untuk segmen ini.`
              )}
              {!decision.reason_codes?.some(c => ['METER_EXHAUSTED', 'METER_NEARLY_EXHAUSTED', 'LIFECYCLE_CONVERTING', 'HIGH_CHURN_RISK', 'FORMER_SUBSCRIBER'].includes(c)) && (
                `Berdasarkan lifecycle stage + engagement score, waktu yang tepat untuk action ini.`
              )}
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Apa yang Harus Di katakan</div>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed italic">
              {decision.selected_action === 'SHOW_MONTHLY' && (
                `"Dengan Rp 64.000/bulan, Anda dapat akses seluruh investigative report dan analisis mendalam Tempo+ tanpa batas."`
              )}
              {decision.selected_action === 'SHOW_ANNUAL' && (
                `"Paket annual adalah pilihan terbaik untuk pembaca setia. Hemat 2 bulan — akses tak terbatas ke seluruh arsip."`
              )}
              {decision.selected_action === 'SHOW_TRIAL' && (
                `"Coba Tempo+ gratis 7 hari. Tidak ada kartu kredit. Rasakan sendiri investigative journalism yang bikin beda."`
              )}
              {decision.selected_action === 'SHOW_SAVE_OFFER' && (
                `"Kami sengaja tawarkan harga khusus untuk Anda — diskon 30% bulan pertama. Jangan sampai kehilangan akses."`
              )}
              {decision.selected_action === 'SHOW_WINBACK' && (
                `"Kami rindu Anda. Kembali ke Tempo+ dengan harga khusus former subscriber — Rp 49.000/bulan."`
              )}
              {decision.selected_action === 'SHOW_SOFT_PAYWALL' && (
                `"Anda sudah membaca 3 artikel gratis. Subscribe Tempo+ untuk akses tak terbatas."`
              )}
              {decision.selected_action === 'SHOW_HARD_PAYWALL' && (
                `"Artikel ini eksklusif untuk subscriber Tempo+. Subscribe sekarang untuk akses penuh."`
              )}
              {decision.selected_action === 'ALLOW_FREE' && (
                `Berikan pengalaman membaca terbaik — bangun trust sebelum monetize.`
              )}
              {['SHOW_REGISTRATION', 'SHOW_NEWSLETTER_GATE', 'NO_ACTION'].includes(decision.selected_action) && (
                `Tidak perlu pitch khusus — fokus ke pengalaman pembaca.`
              )}
              {['SHOW_DAY_PASS', 'SHOW_BUNDLE', 'SHOW_VIP', 'SHOW_RENEWAL', 'SHOW_RETENTION_CONTENT'].includes(decision.selected_action) && (
                `Sesuaikan pitch sesuai offer yang dipilih oleh Revenue Brain.`
              )}
            </p>
          </div>
        </div>

        {/* Peringatan Risiko */}
        {decision.reason_codes?.includes('HIGH_CHURN_RISK') || (decision.reader_features?.churn_risk ?? 0) >= 70 ? (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-red-300 mb-1">Peringatan Risiko</div>
              <p className="text-sm text-red-200/80 leading-relaxed">
                {decision.selected_action === 'NO_ACTION' ? (
                  `CRITICAL: Subscriber aktif dengan churn risk ${decision.reader_features?.churn_risk}% TIDAK diintervensi. Tanpa save offer, churn dalam 14 hari sangat mungkin terjadi.`
                ) : (
                  `Churn risk ${decision.reader_features?.churn_risk}% — deploy save offer dalam 48 jam atau risk kehilangan subscriber ini.`
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <TrendingUp className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-200/80 leading-relaxed">
              Decision sudah dimoderasi oleh lifecycle stage dan propensity score. Risk minimal — pembaca di path yang tepat.
            </p>
          </div>
        )}
      </div>

      {/* Pembaca & Experiment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pembaca */}
        {decision.readers && (
          <Link href={`/dashboard/readers/${decision.reader_id}`} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-200 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <h3 className="font-semibold text-slate-800 text-sm">Pembaca</h3>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Identity</span>
                <span className="font-medium text-slate-600">{decision.readers.identity_status?.toLowerCase()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Subscription</span>
                <span className="font-medium text-slate-600">{decision.readers.subscription_status?.toLowerCase()}</span>
              </div>
              {decision.readers.external_user_id && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">External ID</span>
                  <span className="font-medium text-slate-600 font-mono text-xs">{String(decision.readers.external_user_id).substring(0, 12)}…</span>
                </div>
              )}
            </div>
          </Link>
        )}

        {/* Experiment */}
        {decision.experiment_id && (
          <Link href={`/dashboard/experiments/${decision.experiment_id}`} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-200 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-slate-400" />
                <h3 className="font-semibold text-slate-800 text-sm">Assignment Eksperimen</h3>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-xs text-slate-400 font-mono">{decision.experiment_id.substring(0, 16)}…</div>
          </Link>
        )}

        {/* Detail Teknis */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">Detail Teknis</h3>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">ID Keputusan</span>
              <span className="font-mono text-slate-500">{decision.id.substring(0, 8)}…</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Pembaca ID</span>
              <span className="font-mono text-slate-500">{decision.reader_id.substring(0, 8)}…</span>
            </div>
            {decision.latency_ms != null && (
              <div className="flex justify-between">
                <span className="text-slate-400">Latensi</span>
                <span className="font-medium text-slate-600">{decision.latency_ms}ms</span>
              </div>
            )}
            {decision.selected_offer_id && (
              <div className="flex justify-between">
                <span className="text-slate-400">ID Offer</span>
                <span className="font-mono text-slate-500">{String(decision.selected_offer_id).substring(0, 8)}…</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
