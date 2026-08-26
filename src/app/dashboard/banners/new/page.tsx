'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LayoutGrid } from 'lucide-react';
import BannerBuilder from '@/components/banner/BannerBuilder';
import type { OfferBanner } from '@/domain/types';

export default function NewBannerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSave = async (banner: Partial<OfferBanner>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(banner),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Error: ${data.error}`);
        return;
      }
      router.push(`/dashboard/banners/${data.data.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/banners"
          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create New Banner</h1>
          <p className="text-sm text-slate-500 mt-1">Create a new Tempo+ offer banner</p>
        </div>
      </div>

      <BannerBuilder onSave={handleSave} saving={saving} />
    </div>
  );
}
