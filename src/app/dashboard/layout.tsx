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
  ChevronRight,
  LayoutGrid,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/readers', label: 'Reader Explorer', icon: Users },
  { href: '/dashboard/decisions', label: 'Decision Log', icon: Activity },
  { href: '/dashboard/experiments', label: 'Experiments', icon: FlaskConical },
  { href: '/dashboard/opportunities', label: 'Opportunity Radar', icon: Radar },
  { href: '/dashboard/content', label: 'Content Revenue', icon: FileText },
  { href: '/dashboard/news-moments', label: 'News Moments', icon: Newspaper },
  { href: '/dashboard/copilot', label: 'Revenue Copilot', icon: MessageSquare },
  { href: '/dashboard/demo', label: 'Live Demo', icon: PlayCircle },
  { href: '/dashboard/banners', label: 'Offer Banners', icon: LayoutGrid },
  { href: '/dashboard/settings', label: 'Configuration', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[268px] bg-[#14142B] flex flex-col transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-900/30">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight">Tempo Revenue Brain</div>
              <div className="text-[11px] text-white/40 font-normal">Powered by Rectoverso</div>
            </div>
          </div>
        </div>

        {/* System status pill */}
        <div className="mx-6 mb-5">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-[11px] text-white/60">System operational</span>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-6 border-t border-white/5" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-2 px-3">
            <span className="text-[10px] uppercase tracking-widest text-white/25 font-semibold">
              Navigation
            </span>
          </div>
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
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-150 group ${
                      isActive
                        ? 'bg-white/10 text-white font-medium shadow-sm'
                        : 'text-white/50 hover:text-white/90 hover:bg-white/5'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        isActive ? 'text-red-400' : 'text-white/40 group-hover:text-white/60'
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <ChevronRight className="w-3 h-3 text-white/30 flex-shrink-0" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-white/5">
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
            <div className="text-[11px] text-white/30 text-center leading-relaxed">
              v1.0 MVP · Shadow Mode
              <br />
              <span className="text-white/20">Supabase connected</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-[268px] min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 leading-tight">
                {navItems.find(
                  (n) =>
                    pathname === n.href ||
                    (n.href !== '/dashboard' && pathname.startsWith(n.href))
                )?.label ?? 'Dashboard'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-700">LIVE</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
