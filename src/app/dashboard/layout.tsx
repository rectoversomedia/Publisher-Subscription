'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Activity,
  FlaskConical,
  Radar,
  FileText,
  Newspaper,
  MessageSquare,
  Settings,
  PlayCircle,
  Brain,
  Menu,
  X,
  ChevronRight,
  LayoutGrid,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, desc: 'Overview & KPIs' },
  { href: '/dashboard/readers', label: 'Reader Explorer', icon: Users, desc: 'All readers & profiles' },
  { href: '/dashboard/decisions', label: 'Decision Engine', icon: Activity, desc: 'Live decision log' },
  { href: '/dashboard/opportunities', label: 'Opportunity Radar', icon: Radar, desc: 'High-value prospects' },
  { href: '/dashboard/content', label: 'Content Revenue', icon: FileText, desc: 'Attribution & top content' },
  { href: '/dashboard/experiments', label: 'A/B Experiments', icon: FlaskConical, desc: 'Running tests' },
  { href: '/dashboard/news-moments', label: 'News Moments', icon: Newspaper, desc: 'Breaking news triggers' },
  { href: '/dashboard/copilot', label: 'Revenue Copilot', icon: MessageSquare, desc: 'AI-powered queries' },
  { href: '/dashboard/demo', label: 'Live Demo', icon: PlayCircle, desc: 'Interactive walkthrough' },
  { href: '/dashboard/banners', label: 'Offer Banners', icon: LayoutGrid, desc: 'Banner templates & stats' },
  { href: '/dashboard/settings', label: 'Configuration', icon: Settings, desc: 'System settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const clock = document.getElementById('liveClock');
      const dateEl = document.getElementById('liveDate');
      if (clock) clock.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (dateEl) dateEl.textContent = now.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeItem = navItems.find(
    (n) => pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href))
  );

  return (
    <div className="min-h-screen flex bg-[#080810]">
      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col
          bg-[#0D0D1F] border-r border-white/[0.06]
          transform transition-transform duration-300 ease-out
          lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-60 h-60 bg-[#C41230] opacity-[0.04] rounded-full blur-3xl" />
          <div className="absolute -bottom-20 right-0 w-40 h-40 bg-[#6366F1] opacity-[0.05] rounded-full blur-3xl" />
        </div>

        {/* Brand Header */}
        <div className="relative px-5 pt-7 pb-5 flex-shrink-0">
          <div className="flex items-center gap-3 mb-5">
            {/* Logo mark */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C41230] to-[#8B0000] flex items-center justify-center shadow-lg shadow-red-900/40">
                <Brain className="w-5 h-5 text-white" />
              </div>
              {/* Glow dot */}
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0D0D1F]">
                <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-40" />
              </div>
            </div>
            <div>
              <div className="text-[15px] font-bold text-white leading-tight tracking-tight">Revenue Intelligence</div>
              <div className="text-[10px] text-white/50 font-medium tracking-wide">by Rectoverso</div>
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07]">
            <div className="relative flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping opacity-60" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-semibold text-white/60">System Operational</div>
              <div className="text-[9px] text-white/25">Supabase · All services active</div>
            </div>
            <div className="text-[9px] font-mono text-emerald-400/70 bg-emerald-400/10 px-1.5 py-0.5 rounded">
              v1.0
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 border-t border-white/[0.05]" />

        {/* Nav section label */}
        <div className="px-5 pt-4 pb-2 flex-shrink-0">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">
            Navigation
          </span>
        </div>

        {/* Navigation — full flex */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 overflow-hidden ${
                      isActive
                        ? 'bg-gradient-to-r from-[#C41230]/20 to-transparent border border-[#C41230]/25'
                        : 'hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#C41230] rounded-r-full" />
                    )}
                    {/* Icon */}
                    <div className={`relative flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-[#C41230]/20'
                        : 'bg-white/[0.04] group-hover:bg-white/[0.08]'
                    }`}>
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-[#FF6B7A]' : 'text-white/50 group-hover:text-white/75'
                        }`}
                      />
                    </div>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] font-semibold leading-tight transition-colors ${
                        isActive ? 'text-white' : 'text-white/60 group-hover:text-white/85'
                      }`}>
                        {item.label}
                      </div>
                      <div className={`text-[10px] mt-0.5 transition-colors ${
                        isActive ? 'text-white/40' : 'text-white/30 group-hover:text-white/50'
                      }`}>
                        {item.desc}
                      </div>
                    </div>
                    {/* Arrow */}
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-[#C41230]/60 flex-shrink-0" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Divider */}
        <div className="mx-5 border-t border-white/[0.05]" />

        {/* Quick stats footer */}
        <div className="px-3 py-4 flex-shrink-0 space-y-2">
          <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-3 h-3 text-emerald-400/70" />
              <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Today's Uplift</span>
            </div>
            <div className="text-[18px] font-black text-white font-mono tracking-tight">+Rp 2.3M</div>
            <div className="text-[10px] text-emerald-400/70 mt-0.5">↑ 12% vs yesterday</div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
              <div className="text-[13px] font-bold text-white">312</div>
              <div className="text-[9px] text-white/25">Readers</div>
            </div>
            <div className="flex-1 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
              <div className="text-[13px] font-bold text-white">47</div>
              <div className="text-[9px] text-white/25">Decisions</div>
            </div>
            <div className="flex-1 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
              <div className="text-[13px] font-bold text-emerald-400">8</div>
              <div className="text-[9px] text-white/25">Subs</div>
            </div>
          </div>
        </div>

        {/* Version + brand footer */}
        <div className="px-5 py-4 flex-shrink-0 border-t border-white/[0.05]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-[#C41230]/60" />
            <span className="text-[10px] text-white/35">Shadow Mode MVP</span>
            <span className="ml-auto flex items-center gap-1 text-[10px] text-white/25">
              <ShieldCheck className="w-3 h-3" />
              SSL active
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main Content Area ─────────────────────────────── */}
      <div className="flex-1 lg:ml-[260px] min-h-screen flex flex-col min-w-0 bg-white">

        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu toggle */}
            <button
              className="lg:hidden p-2 -ml-2 text-white/40 hover:text-white/80 hover:bg-white/[0.06] rounded-lg transition-all flex-shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 min-w-0" />
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Live badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-400/10 border border-emerald-400/20 rounded-full">
              <div className="relative">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping opacity-50" />
              </div>
              <span className="text-[10px] font-bold text-emerald-400 tracking-wider">LIVE</span>
            </div>

            {/* Clock */}
            <div className="hidden md:block text-right">
              <div className="text-[11px] font-semibold text-slate-600" id="liveClock">--:--:--</div>
              <div className="text-[9px] text-slate-400" id="liveDate">---</div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 min-w-0 bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
