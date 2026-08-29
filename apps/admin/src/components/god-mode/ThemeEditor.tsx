'use client';

import { useState, useMemo } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type Props = { initialTheme: Record<string, string> | null; initialLogo: string | null; initialFavicon: string | null };

const DEFAULTS: Record<string, string> = {
  brand_600: '#1756C8',
  life_600: '#0CAF74',
  emergency_600: '#DC2626',
  accent_500: '#F59E0B',
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function luminance({ r, g, b }: { r: number; g: number; b: number }) {
  const toLinear = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const L1 = luminance(rgb);
  const L2 = luminance({ r: 255, g: 255, b: 255 }); // white text
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function ThemeEditor({ initialTheme, initialLogo, initialFavicon }: Props) {
  const toast = useToast();
  const initial = useMemo(() => ({ ...DEFAULTS, ...(initialTheme ?? {}) }), [initialTheme]);
  const [colors, setColors] = useState<Record<string, string>>(initial);
  const [logo, setLogo] = useState(initialLogo ?? '');
  const [favicon, setFavicon] = useState(initialFavicon ?? '');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const contrast = useMemo(() => contrastRatio(colors.brand_600 ?? DEFAULTS.brand_600!), [colors.brand_600]);
  const lowContrast = contrast !== null && contrast < 4.5;

  const hasChanges =
    JSON.stringify(colors) !== JSON.stringify(initial) ||
    (logo || '') !== (initialLogo ?? '') ||
    (favicon || '') !== (initialFavicon ?? '');

  const handlePublish = async () => {
    setBusy(true);
    const res = await fetch('/api/admin/app-settings/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme_colors: colors, logo_url: logo || null, favicon_url: favicon || null }),
    }).catch(() => null);
    setBusy(false);
    setConfirmOpen(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'প্রকাশ করা যায়নি', 'error');
      return;
    }
    toast.push('✅ থিম আপডেট হয়েছে — পরবর্তী ৫ মিনিটে সব পেজে প্রয়োগ হবে', 'success');
  };

  const reset = () => setColors({ ...DEFAULTS });

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="rounded-xl border border-admin-border bg-white p-4">
        <h2 className="text-admin-h3 text-neutral-900">ব্র্যান্ড রং</h2>
        <p className="mt-1 text-admin-small text-neutral-500">শুধু ৪টি semantic token — নিরপেক্ষ রং, spacing, টাইপোগ্রাফি কোডে স্থির।</p>

        <div className="mt-4 flex flex-col gap-4">
          {(['brand_600', 'life_600', 'emergency_600', 'accent_500'] as const).map((key) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-admin-small font-medium text-neutral-700">
                {key === 'brand_600' ? 'প্রাইমারি (Brand)' : key === 'life_600' ? 'সাকসেস (Life)' : key === 'emergency_600' ? 'জরুরি (Emergency)' : 'অ্যাকসেন্ট'}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-9 w-9 shrink-0 rounded-md border border-admin-border" style={{ background: colors[key] ?? '#fff' }} aria-hidden />
                <input value={colors[key] ?? ''} onChange={(e) => setColors((prev) => ({ ...prev, [key]: e.target.value }))} placeholder="#1756C8" className="h-9 flex-1 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
                <input type="color" value={colors[key] ?? '#000000'} onChange={(e) => setColors((prev) => ({ ...prev, [key]: e.target.value }))} className="h-9 w-9 rounded border border-admin-border p-0.5" />
              </span>
              {key === 'brand_600' && lowContrast && (
                <span className="rounded-md bg-amber-50 px-2 py-1 text-admin-small text-amber-700">⚠️ এই রং বাটনের সাদা লেখার সাথে পড়তে কষ্ট হতে পারে (contrast {contrast?.toFixed(2)} &lt; 4.5). তবুও প্রকাশ করবেন?</span>
              )}
            </label>
          ))}
        </div>

        <div className="mt-6">
          <h3 className="text-admin-small font-medium text-neutral-700">লোগো ও আইকন</h3>
          <label className="mt-2 flex flex-col gap-1">
            <span className="text-admin-small text-neutral-600">Logo URL</span>
            <input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          </label>
          <label className="mt-2 flex flex-col gap-1">
            <span className="text-admin-small text-neutral-600">Favicon URL</span>
            <input value={favicon} onChange={(e) => setFavicon(e.target.value)} placeholder="https://.../favicon.ico" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          </label>
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={reset} className="h-9 rounded-md border border-admin-border bg-white px-3 text-admin-small font-medium text-neutral-700 hover:bg-neutral-50">🔄 ডিফল্ট রঙে ফিরে যান</button>
          <button onClick={() => setConfirmOpen(true)} disabled={!hasChanges || busy} className="ml-auto h-9 rounded-md bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {busy ? 'প্রকাশ হচ্ছে...' : 'প্রকাশ করুন'}
          </button>
        </div>
        {!hasChanges && <p className="mt-2 text-center text-admin-small text-neutral-400">কোনো পরিবর্তন নেই</p>}
      </div>

      <div className="rounded-xl border border-admin-border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-admin-h3 text-neutral-900">লাইভ প্রিভিউ (MVP)</h2>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">iframe — পরবর্তী ধাপে</span>
        </div>
        <p className="mt-1 text-admin-small text-neutral-500">প্রকাশের আগে বাটন/ব্যাজে নতুন রং কেমন দেখাবে তার প্রিভিউ।</p>
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-admin-border bg-neutral-50 p-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full px-3 py-1.5 text-admin-small font-semibold text-white" style={{ background: colors.brand_600 }}>Brand বাটন</span>
            <span className="rounded-full px-3 py-1.5 text-admin-small font-semibold text-white" style={{ background: colors.life_600 }}>Life ব্যাজ</span>
            <span className="rounded-full px-3 py-1.5 text-admin-small font-semibold text-white" style={{ background: colors.emergency_600 }}>Emergency</span>
            <span className="rounded-full px-3 py-1.5 text-admin-small font-semibold text-white" style={{ background: colors.accent_500 }}>Accent</span>
          </div>
          <div className="flex gap-2">
            <button className="h-9 rounded-md px-4 text-admin-body font-semibold text-white" style={{ background: colors.brand_600 }}>প্রাথমিক বাটন</button>
            <button className="h-9 rounded-md border border-admin-border bg-white px-4 text-admin-body font-medium text-neutral-700">সেকেন্ডারি</button>
          </div>
          {lowContrast && <p className="text-admin-small font-medium text-amber-700">⚠️ Brand রং-এ সাদা লেখার contrast কম — WCAG AA 4.5:1 এর নিচে।</p>}
          {contrast && <p className="text-admin-small text-neutral-400">Brand vs white contrast: {contrast.toFixed(2)}:1 {contrast >= 4.5 ? '✅ AA পাস' : '⚠️ ফেল'}</p>}
        </div>
        <p className="mt-3 text-admin-small text-neutral-400">প্রকাশ করলে <code className="rounded bg-neutral-100 px-1">app_settings.theme_colors</code> আপডেট হবে; user-app root layout CSS variable হিসেবে ইনজেক্ট করে — পরবর্তী পেজ লোডে কার্যকর।</p>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="থিম প্রকাশ করবেন?"
        description={lowContrast ? '⚠️ Brand রং-এ সাদা লেখার contrast কম — পড়তে কষ্ট হতে পারে। তবুও প্রকাশ করবেন?' : 'এই পরিবর্তন সাথে সাথে সব ইউজারের কাছে দেখা যাবে।'}
        confirmLabel="হ্যাঁ, প্রকাশ করুন"
        variant={lowContrast ? 'warning' : 'info'}
        busy={busy}
        onConfirm={handlePublish}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
