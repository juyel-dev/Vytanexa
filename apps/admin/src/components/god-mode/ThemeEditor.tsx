'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type Props = { initialLogo: string | null; initialFavicon: string | null };

/**
 * TODO.md Phase 8.1 (product decision, locked). This used to also
 * offer 4 brand-color hex pickers + a live contrast-checked preview —
 * removed. That part was confirmed dead: it saved to
 * `app_settings.theme_colors`, but apps/web's root layout never read
 * it (Tailwind utility classes are static at build time from
 * `packages/config/design-tokens.js`, not runtime CSS variables), so
 * publishing a color "worked" (toast, save, contrast checker) while
 * doing nothing on the live site. Building the CSS-variable pipeline
 * to make that real would cost more than a one-time rebrand is worth
 * — brand colors stay code-level. Logo/favicon are different: they
 * genuinely might change (seasonal campaigns, events), so that half
 * is kept and now actually wired end-to-end
 * (apps/web/src/app/layout.tsx reads `app_settings.logo_url` /
 * `favicon_url`).
 */
export function ThemeEditor({ initialLogo, initialFavicon }: Props) {
  const toast = useToast();
  const [logo, setLogo] = useState(initialLogo ?? '');
  const [favicon, setFavicon] = useState(initialFavicon ?? '');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const hasChanges = (logo || '') !== (initialLogo ?? '') || (favicon || '') !== (initialFavicon ?? '');

  const handlePublish = async () => {
    setBusy(true);
    const res = await fetch('/api/admin/app-settings/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logo_url: logo || null, favicon_url: favicon || null }),
    }).catch(() => null);
    setBusy(false);
    setConfirmOpen(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'প্রকাশ করা যায়নি', 'error');
      return;
    }
    toast.push('✅ লোগো/আইকন আপডেট হয়েছে — পরবর্তী পেজ লোডে কার্যকর', 'success');
  };

  return (
    <div className="max-w-md rounded-xl border border-admin-border bg-white p-4">
      <h2 className="text-admin-h3 text-neutral-900">লোগো ও আইকন</h2>
      <p className="mt-1 text-admin-small text-neutral-500">
        ব্র্যান্ড রং কোড-লেভেলে স্থির থাকে (আলাদা রি-ব্র্যান্ডিং প্রজেক্ট ছাড়া বদলায় না)। শুধু লোগো ও ফেভিকন এখান থেকে বদলানো যায়।
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-admin-small text-neutral-600">Logo URL</span>
          <input
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
            placeholder="https://..."
            className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-admin-small text-neutral-600">Favicon URL</span>
          <input
            value={favicon}
            onChange={(e) => setFavicon(e.target.value)}
            placeholder="https://.../favicon.ico"
            className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={!hasChanges || busy}
          className="h-9 rounded-md bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {busy ? 'প্রকাশ হচ্ছে...' : 'প্রকাশ করুন'}
        </button>
      </div>
      {!hasChanges && <p className="mt-2 text-right text-admin-small text-neutral-400">কোনো পরিবর্তন নেই</p>}

      <ConfirmDialog
        open={confirmOpen}
        title="লোগো/আইকন প্রকাশ করবেন?"
        description="এই পরিবর্তন সাথে সাথে সব ইউজারের কাছে দেখা যাবে।"
        confirmLabel="হ্যাঁ, প্রকাশ করুন"
        variant="info"
        busy={busy}
        onConfirm={handlePublish}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
