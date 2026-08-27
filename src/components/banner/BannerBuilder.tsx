'use client';

import { useState, useCallback } from 'react';
import type {
  OfferBanner,
  BannerType,
  BannerLayout,
  BannerTheme,
  BannerCTAAction,
  BannerWithStats,
} from '@/domain/types';
import { BANNER_TYPE_LABELS, BANNER_TYPE_COLORS } from '@/domain/types';
import { BannerIcon } from './BannerIcons';
import {
  LayoutDashboard, Type, MousePointer, Palette, Target, Clock, BarChart2,
  Plus, Trash2, Save, Eye, Copy, ChevronDown, ChevronRight, Check, X,
  AlertTriangle, TrendingUp, MousePointerClick, RotateCcw
} from 'lucide-react';

// ── Field Components ─────────────────────────────────────────

function FieldGroup({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      {hint && <p className="text-xs text-slate-400 -mt-0.5">{hint}</p>}
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, className = '', type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C41230]/50 focus:border-transparent ${className}`}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C41230]/50 resize-none"
    />
  );
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C41230]/50"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-red-600' : 'bg-white/[0.12]'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
      <span className="text-sm text-slate-600">{label}</span>
    </label>
  );
}

function ChipSelect({ value, onChange, options }: {
  value: string[]; onChange: (v: string[]) => void; options: { value: string; label: string }[];
}) {
  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter(x => x !== v));
    else onChange([...value, v]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => toggle(o.value)}
          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
            value.includes(o.value)
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-500 border-slate-200 hover:border-white/[0.15]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ColorSwatch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const presets = ['#DC2626', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#0F172A', '#1E293B', '#FFFFFF', '#F8FAFC'];
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border-0"
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-2 py-1 text-xs border border-slate-200 rounded w-24 font-mono"
      />
      {presets.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-6 h-6 rounded-full border-2 border-transparent hover:border-white/30 transition-colors"
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

// ── Section Accordion ────────────────────────────────────────

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-3.5 bg-slate-50 hover:bg-slate-50 transition-colors text-left"
      >
        {open ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
        <Icon className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-semibold text-slate-600">{title}</span>
      </button>
      {open && <div className="p-5 space-y-5">{children}</div>}
    </div>
  );
}

// ── Preview Pane ──────────────────────────────────────────────

function BannerPreview({ banner }: { banner: Partial<OfferBanner> }) {
  const t = (v: string | null | undefined) => v ?? '';
  const theme = (banner.theme ?? 'dark') as BannerTheme;
  const isDark = theme === 'dark';
  const tokens = {
    dark: { bg: 'bg-[#0D0D1F]', text: 'text-white', muted: 'text-white/50', btn: 'bg-red-600 text-white', bar: 'border-red-600' },
    light: { bg: 'bg-white', text: 'text-slate-900', muted: 'text-slate-500', btn: 'bg-red-600 text-white font-bold', bar: 'border-slate-200' },
    red: { bg: 'bg-red-600', text: 'text-white', muted: 'text-red-100', btn: 'bg-white text-red-700', bar: 'border-red-400' },
    emerald: { bg: 'bg-emerald-600', text: 'text-white', muted: 'text-emerald-100', btn: 'bg-white text-emerald-700', bar: 'border-emerald-400' },
  }[theme];

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
      {/* Browser chrome */}
      <div className="bg-slate-100 px-4 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white/70 rounded px-3 py-0.5 text-xs text-slate-500 text-center">
          tempo.co/article/investigasi-korupsi
        </div>
      </div>

      {/* Article mock */}
      <div className="p-4 space-y-3">
        <div className="h-2 bg-slate-100 rounded w-1/3" />
        <div className="h-4 bg-slate-300 rounded w-2/3" />
        <div className="h-2 bg-slate-100 rounded w-full" />
        <div className="h-2 bg-slate-100 rounded w-5/6" />

        {/* Banner preview */}
        <div className={`${tokens.bg} rounded-xl border-t-2 ${tokens.bar} p-4 mt-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white bg-slate-100 flex-shrink-0`}>
              <span className="text-sm">🔒</span>
            </div>
            <div className="flex-1">
              <p className={`text-sm font-bold ${tokens.text}`}>{t(banner.headline) || 'Banner headline akan muncul di sini'}</p>
              <p className={`text-xs ${tokens.muted} mt-0.5`}>{t(banner.body_copy) || 'Body copy banner akan muncul di sini'}</p>
            </div>
            <button className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tokens.btn} flex-shrink-0`}>
              {t(banner.cta_label) || 'CTA Button'}
            </button>
          </div>
          {banner.show_price && banner.discounted_price && (
            <div className="mt-2 text-right">
              <span className={`text-lg font-black ${tokens.text}`}>
                Rp {(banner.discounted_price ?? 0).toLocaleString('id-ID')}
              </span>
              {banner.original_price && banner.original_price > (banner.discounted_price ?? 0) && (
                <span className={`text-xs line-through ml-1 ${tokens.muted}`}>
                  Rp {(banner.original_price ?? 0).toLocaleString('id-ID')}
                </span>
              )}
              <span className={`text-xs ${tokens.muted}`}> {banner.billing_period ?? '/month'}</span>
            </div>
          )}
        </div>

        <div className="h-2 bg-slate-100 rounded w-full" />
        <div className="h-2 bg-slate-100 rounded w-4/5" />
      </div>
    </div>
  );
}

// ── Main Builder ─────────────────────────────────────────────

interface BannerBuilderProps {
  initialBanner?: Partial<OfferBanner>;
  existingBanners?: OfferBanner[];
  onSave: (banner: Partial<OfferBanner>) => Promise<void>;
  onPreview?: (banner: Partial<OfferBanner>) => void;
  saving?: boolean;
}

const BANNER_TYPES = Object.entries(BANNER_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const LAYOUTS: { value: BannerLayout; label: string; desc: string }[] = [
  { value: 'modal', label: 'Modal', desc: 'Centered popup' },
  { value: 'slide_in', label: 'Slide-in', desc: 'Slides up from bottom' },
  { value: 'inline', label: 'Inline', desc: 'Embedded in article' },
  { value: 'banner', label: 'Banner', desc: 'Horizontal strip' },
  { value: 'interstitial', label: 'Interstitial', desc: 'Fullscreen before content' },
];
const THEMES: { value: BannerTheme; label: string; swatch: string }[] = [
  { value: 'dark', label: 'Dark', swatch: '#0F172A' },
  { value: 'light', label: 'Light', swatch: '#FFFFFF' },
  { value: 'red', label: 'Tempo Red', swatch: '#DC2626' },
  { value: 'emerald', label: 'Emerald', swatch: '#059669' },
];
const CTA_ACTIONS: { value: BannerCTAAction; label: string }[] = [
  { value: 'SUBSCRIBE', label: 'Subscribe' },
  { value: 'TRIAL', label: 'Start Trial' },
  { value: 'REGISTER', label: 'Register' },
  { value: 'NEWSLETTER', label: 'Newsletter Signup' },
  { value: 'DISMISS', label: 'Dismiss Only' },
  { value: 'EXTERNAL', label: 'External Link' },
];
const LIFECYCLE_OPTIONS = [
  { value: 'NEW', label: 'New Reader' },
  { value: 'CASUAL', label: 'Casual' },
  { value: 'ENGAGED', label: 'Engaged' },
  { value: 'HIGH_INTENT', label: 'High Intent' },
  { value: 'CONVERTING', label: 'Converting' },
  { value: 'SUBSCRIBED', label: 'Subscriber' },
  { value: 'AT_RISK', label: 'At Risk' },
  { value: 'LAPSED', label: 'Lapsed' },
  { value: 'WINBACK', label: 'Winback' },
];
const ICONS = ['lock', 'crown', 'sparkles', 'heart', 'percent', 'mail', 'star', 'gift', 'fire'];

export default function BannerBuilder({ initialBanner, existingBanners = [], onSave, onPreview, saving }: BannerBuilderProps) {
  const defaultBanner: Partial<OfferBanner> = {
    name: '',
    slug: '',
    banner_type: 'PROMO_OFFER',
    headline: '',
    headline_variant_b: '',
    body_copy: '',
    body_copy_variant_b: '',
    cta_label: 'Subscribe Now',
    cta_label_variant_b: '',
    cta_action: 'SUBSCRIBE',
    layout: 'modal',
    theme: 'dark',
    icon: 'lock',
    accent_color: '#DC2626',
    background_color: null,
    text_color: null,
    badge_label: '',
    badge_color: '#DC2626',
    show_price: true,
    original_price: 64000,
    discounted_price: null,
    billing_period: '/month',
    target_lifecycle: [],
    target_min_propensity: null,
    target_max_propensity: null,
    target_platform: [],
    is_ab_test: false,
    variant_allocation_percentage: 50,
    is_active: true,
    priority: 50,
    starts_at: null,
    ends_at: null,
    impression_cap: null,
    impressions_per_reader: 3,
    ...initialBanner,
  };

  const [banner, setBanner] = useState<Partial<OfferBanner>>(defaultBanner);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = useCallback(<K extends keyof OfferBanner>(key: K, value: OfferBanner[K]) => {
    setBanner(prev => ({ ...prev, [key]: value }));

    // Auto-generate slug from name
    if (!slugEdited && key === 'name' && typeof value === 'string') {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setBanner(prev => ({ ...prev, slug }));
    }
    onPreview?.({ ...banner, [key]: value });
  }, [banner, slugEdited, onPreview]);

  const handleSave = async () => {
    await onSave(banner);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const typeColor = BANNER_TYPE_COLORS[banner.banner_type as BannerType] ?? BANNER_TYPE_COLORS.PROMO_OFFER;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* LEFT: Builder Form */}
      <div className="space-y-4">

        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-semibold text-slate-800 text-sm">Banner Information</h3>
          <FieldGroup label="Banner Name">
            <Input value={banner.name ?? ''} onChange={v => set('name', v as never)} placeholder="e.g., Soft Paywall Default" />
          </FieldGroup>
          <FieldGroup label="Slug (Unique ID)">
            <Input value={banner.slug ?? ''} onChange={v => { set('slug', v as never); setSlugEdited(true); }} placeholder="soft-paywall-default" />
          </FieldGroup>
          <FieldGroup label="Banner Type">
            <div className="flex flex-wrap gap-2">
              {BANNER_TYPES.map(bt => {
                const colors = BANNER_TYPE_COLORS[bt.value as BannerType];
                const isActive = banner.banner_type === bt.value;
                return (
                  <button
                    key={bt.value}
                    type="button"
                    onClick={() => set('banner_type', bt.value as BannerType)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                      isActive ? `${colors.bg} ${colors.text} border-transparent` : 'bg-white text-slate-500 border-slate-200 hover:border-white/[0.15]'
                    }`}
                  >
                    {bt.label}
                  </button>
                );
              })}
            </div>
          </FieldGroup>
          <div className="flex items-center gap-3 pt-1">
            <Toggle
              value={banner.is_active ?? true}
              onChange={v => set('is_active', v)}
              label="Active banner"
            />
          </div>
        </div>

        {/* Copy */}
        <Section title="Copy & Headline" icon={Type} defaultOpen>
          <FieldGroup label="Headline Variant A *" hint="Use {{free_articles_read}} to show free article count">
            <Input value={banner.headline ?? ''} onChange={v => set('headline', v as never)} placeholder="You have read {{free_articles_read}} of 3 free articles" />
          </FieldGroup>
          {banner.is_ab_test && (
            <FieldGroup label="Headline Variant B (A/B Test)">
              <Input value={banner.headline_variant_b ?? ''} onChange={v => set('headline_variant_b', v as never)} placeholder="Alternative headline for test" />
            </FieldGroup>
          )}
          <FieldGroup label="Body Copy">
            <Textarea value={banner.body_copy ?? ''} onChange={v => set('body_copy', v as never)} placeholder="Supporting text below the headline" rows={3} />
          </FieldGroup>
          {banner.is_ab_test && (
            <FieldGroup label="Body Copy Variant B">
              <Textarea value={banner.body_copy_variant_b ?? ''} onChange={v => set('body_copy_variant_b', v as never)} placeholder="Alternative body copy" rows={2} />
            </FieldGroup>
          )}
        </Section>

        {/* CTA */}
        <Section title="CTA Button" icon={MousePointer}>
          <FieldGroup label="Button Label Variant A">
            <Input value={banner.cta_label ?? ''} onChange={v => set('cta_label', v as never)} placeholder="Subscribe Now" />
          </FieldGroup>
          {banner.is_ab_test && (
            <FieldGroup label="CTA Label Variant B">
              <Input value={banner.cta_label_variant_b ?? ''} onChange={v => set('cta_label_variant_b', v as never)} placeholder="Alternative label" />
            </FieldGroup>
          )}
          <FieldGroup label="Action After Click">
            <Select value={banner.cta_action ?? 'SUBSCRIBE'} onChange={v => set('cta_action', v as BannerCTAAction)} options={CTA_ACTIONS} />
          </FieldGroup>
        </Section>

        {/* Visual */}
        <Section title="Appearance & Colors" icon={Palette}>
          <FieldGroup label="Layout">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LAYOUTS.map(l => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => set('layout', l.value as BannerLayout)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    banner.layout === l.value ? 'border-red-600 bg-red-50' : 'border-slate-200 hover:border-white/[0.15]'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-600">{l.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{l.desc}</div>
                </button>
              ))}
            </div>
          </FieldGroup>
          <FieldGroup label="Theme">
            <div className="flex gap-3">
              {THEMES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set('theme', t.value as BannerTheme)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    banner.theme === t.value ? 'border-red-600 bg-red-50' : 'border-slate-200 hover:border-white/[0.15]'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: t.swatch }} />
                  {t.label}
                </button>
              ))}
            </div>
          </FieldGroup>
          <FieldGroup label="Accent Color">
            <ColorSwatch value={banner.accent_color ?? '#DC2626'} onChange={v => set('accent_color', v as never)} />
          </FieldGroup>
          <FieldGroup label="Icon">
            <div className="flex flex-wrap gap-2">
              {ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => set('icon', icon)}
                  className={`w-10 h-10 rounded-lg border text-center flex items-center justify-center transition-colors ${
                    banner.icon === icon ? 'border-red-600 bg-red-50' : 'border-slate-200 hover:border-white/[0.15]'
                  }`}
                >
                  <BannerIcon name={icon} size={18} />
                </button>
              ))}
            </div>
          </FieldGroup>
          <FieldGroup label="Badge Label (optional)">
            <div className="flex gap-2">
              <Input value={banner.badge_label ?? ''} onChange={v => set('badge_label', v as never)} placeholder="e.g., 30% OFF" className="flex-1" />
              <input type="color" value={banner.badge_color ?? '#DC2626'} onChange={e => set('badge_color', e.target.value as never)} className="w-10 h-10 rounded cursor-pointer border border-slate-200" />
            </div>
          </FieldGroup>
        </Section>

        {/* Pricing */}
        <Section title="Pricing & Offer" icon={TrendingUp} defaultOpen={false}>
          <Toggle value={banner.show_price ?? true} onChange={v => set('show_price', v)} label="Show price" />
          {banner.show_price && (
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Original Price (Rp)">
                <Input type="number" value={String(banner.original_price ?? '')} onChange={v => set('original_price', parseInt(v) as never)} placeholder="64000" />
              </FieldGroup>
              <FieldGroup label="Discounted Price (Rp)">
                <Input type="number" value={String(banner.discounted_price ?? '')} onChange={v => set('discounted_price', v ? parseInt(v) as never : null as never)} placeholder="44800" />
              </FieldGroup>
              <div className="col-span-2">
                <FieldGroup label="Period Label">
                  <Input value={banner.billing_period ?? '/month'} onChange={v => set('billing_period', v as never)} placeholder="/month" />
                </FieldGroup>
              </div>
            </div>
          )}
        </Section>

        {/* Targeting */}
        <Section title="Targeting" icon={Target} defaultOpen={false}>
          <FieldGroup label="Lifecycle Stage" hint="Leave empty to target all stages">
            <ChipSelect
              value={banner.target_lifecycle ?? []}
              onChange={v => set('target_lifecycle', v as never)}
              options={LIFECYCLE_OPTIONS}
            />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Min Propensity (0-100)">
              <Input type="number" value={String(banner.target_min_propensity ?? '')} onChange={v => set('target_min_propensity', v ? parseInt(v) as never : null as never)} placeholder="60" />
            </FieldGroup>
            <FieldGroup label="Max Propensity">
              <Input type="number" value={String(banner.target_max_propensity ?? '')} onChange={v => set('target_max_propensity', v ? parseInt(v) as never : null as never)} placeholder="100" />
            </FieldGroup>
          </div>
          <FieldGroup label="Platform">
            <ChipSelect
              value={banner.target_platform ?? []}
              onChange={v => set('target_platform', v as never)}
              options={[
                { value: 'web', label: 'Web' },
                { value: 'ios', label: 'iOS' },
                { value: 'android', label: 'Android' },
              ]}
            />
          </FieldGroup>
        </Section>

        {/* A/B Test */}
        <Section title="A/B Testing" icon={BarChart2} defaultOpen={false}>
          <Toggle value={banner.is_ab_test ?? false} onChange={v => set('is_ab_test', v)} label="Enable A/B Test" />
          {banner.is_ab_test && (
            <FieldGroup label="Traffic to Variant B (%)" hint="50% = equal split">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0} max={100} step={10}
                  value={banner.variant_allocation_percentage ?? 50}
                  onChange={e => set('variant_allocation_percentage', parseInt(e.target.value) as never)}
                  className="flex-1"
                />
                <span className="text-sm font-bold text-slate-600 w-10">{banner.variant_allocation_percentage ?? 50}%</span>
              </div>
              <div className="flex text-xs text-slate-500">
                <span className="flex-1">Variant A</span>
                <span className="flex-1 text-right">Variant B</span>
              </div>
            </FieldGroup>
          )}
        </Section>

        {/* Schedule & Cap */}
        <Section title="Schedule & Frequency Cap" icon={Clock} defaultOpen={false}>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Start">
              <Input type="datetime-local" value={banner.starts_at ? banner.starts_at.slice(0, 16) : ''} onChange={v => set('starts_at', v ? new Date(v).toISOString() as never : null as never)} />
            </FieldGroup>
            <FieldGroup label="End">
              <Input type="datetime-local" value={banner.ends_at ? banner.ends_at.slice(0, 16) : ''} onChange={v => set('ends_at', v ? new Date(v).toISOString() as never : null as never)} />
            </FieldGroup>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Max Total Impressions" hint="NULL = unlimited">
              <Input type="number" value={String(banner.impression_cap ?? '')} onChange={v => set('impression_cap', v ? parseInt(v) as never : null as never)} placeholder="Unlimited" />
            </FieldGroup>
            <FieldGroup label="Max per Reader">
              <Input type="number" value={String(banner.impressions_per_reader ?? 3)} onChange={v => set('impressions_per_reader', parseInt(v) as never)} placeholder="3" />
            </FieldGroup>
          </div>
          <FieldGroup label="Priority (1-100)">
            <div className="flex items-center gap-3">
              <input
                type="range" min={1} max={100}
                value={banner.priority ?? 50}
                onChange={e => set('priority', parseInt(e.target.value) as never)}
                className="flex-1"
              />
              <span className="text-sm font-bold text-slate-600 w-8 text-right">{banner.priority ?? 50}</span>
            </div>
            <p className="text-xs text-slate-400">Higher priority banners appear first when multiple banners match</p>
          </FieldGroup>
        </Section>

        {/* Save */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !banner.name || !banner.headline}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              saving ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
              saved ? 'bg-emerald-600 text-white' :
              'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
            }`}
          >
            {saving ? <RotateCcw className="w-4 h-4 animate-spin" /> :
             saved ? <Check className="w-4 h-4" /> :
             <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Banner'}
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen(!previewOpen)}
            className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50"
          >
            <Eye className="w-4 h-4" /> Preview
          </button>
        </div>
      </div>

      {/* RIGHT: Preview */}
      {previewOpen && (
        <div className="xl:sticky xl:top-6 xl:self-start space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-600">Live Preview</h3>
            <button onClick={() => setPreviewOpen(false)} className="text-slate-400 hover:text-slate-500">
              <X className="w-4 h-4" />
            </button>
          </div>
          <BannerPreview banner={banner} />
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Summary</h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span className="font-medium text-slate-600">{BANNER_TYPE_LABELS[banner.banner_type as BannerType] ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Layout</span>
                <span className="font-medium text-slate-600 capitalize">{banner.layout}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Theme</span>
                <span className="font-medium text-slate-600 capitalize">{banner.theme}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">A/B Test</span>
                <span className={`font-medium ${banner.is_ab_test ? 'text-blue-600' : 'text-slate-400'}`}>{banner.is_ab_test ? `Yes (${banner.variant_allocation_percentage ?? 50}% → B)` : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active</span>
                <span className={`font-medium ${banner.is_active ? 'text-emerald-600' : 'text-red-500'}`}>{banner.is_active ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target</span>
                <span className="font-medium text-slate-600">
                  {banner.target_lifecycle?.length
                    ? banner.target_lifecycle.join(', ')
                    : 'All stages'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
