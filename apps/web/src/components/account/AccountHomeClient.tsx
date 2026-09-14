'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ClipboardList, HelpCircle, Star, ChevronRight, Pencil } from 'lucide-react';
import { useT } from '@vytanexa/i18n/client';
import { toBengaliDigits } from '@/lib/i18n-client';

/**
 * Account Home Client — VYTANEXA-BLUEPRINT.md § S17 "Account Home".
 * Delete confirmation requires typing "মুছুন" per spec ("type মুছুন
 * to confirm, or simple double-confirm dialog" — chose the typed
 * confirmation, a stronger friction-match for a destructive,
 * irreversible action than a second tap would be).
 */
export function AccountHomeClient({
  name,
  phone,
  counts,
}: {
  name: string | null;
  phone: string | null;
  counts: { favorites: number; history: number; questions: number; reviews: number };
}) {
  const t = useT('account');
  const tc = useT('common');
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmWord = t('deleteConfirmWord');

  const handleDelete = async () => {
    if (confirmText !== confirmWord) return;
    setDeleting(true);
    setError(null);
    const res = await fetch('/api/account/delete', { method: 'POST' });
    setDeleting(false);
    if (!res.ok) {
      setError(t('deleteAccountFailed'));
      return;
    }
    router.replace('/');
    router.refresh();
  };

  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[22px] font-bold text-brand-700">
          {name ? name.charAt(0) : '👤'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-bold text-neutral-900">
            {name ?? t('defaultUserName')}
          </p>
          {phone && <p className="text-[13px] text-neutral-500">{phone}</p>}
          <Link
            href="/account/profile"
            className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600"
          >
            <Pencil className="h-3.5 w-3.5" /> {t('editProfile')}
          </Link>
        </div>
      </div>

      <div className="px-4 py-2">
        <AccountRow
          href="/account/favorites"
          icon={Heart}
          label={t('rows.favorites')}
          count={counts.favorites}
        />
        <AccountRow
          href="/account/history"
          icon={ClipboardList}
          label={t('rows.appointmentHistory')}
          count={counts.history}
        />
        <AccountRow
          href="/account/qa"
          icon={HelpCircle}
          label={t('rows.myQa')}
          count={counts.questions}
        />
        <AccountRow href="/account/reviews" icon={Star} label={t('rows.myReviews')} count={counts.reviews} />
      </div>

      <div className="px-4 py-6 text-center">
        <button
          onClick={() => setDeleteOpen(true)}
          className="text-[12px] text-neutral-400 underline"
        >
          {t('deleteAccount')}
        </button>
      </div>

      {deleteOpen && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-sm rounded-xl bg-white p-5">
            <p className="mb-2 text-[15px] font-bold text-emergency-700">{t('deleteConfirmTitle')}</p>
            <p className="mb-3 text-[13px] text-neutral-600">
              {t.rich('deleteConfirmBody', {
                word: confirmWord,
                b: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmWord}
              className="mb-3 h-11 w-full rounded-md border border-neutral-200 px-3 text-center text-[14px]"
            />
            {error && <p className="mb-2 text-[12px] text-emergency-600">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDeleteOpen(false);
                  setConfirmText('');
                }}
                className="h-11 flex-1 rounded-md border border-neutral-200 text-[14px] font-semibold text-neutral-700"
              >
                {tc('cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== confirmWord || deleting}
                className="h-11 flex-1 rounded-md bg-emergency-600 text-[14px] font-semibold text-white disabled:opacity-40"
              >
                {deleting ? '...' : t('deleteConfirmButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountRow({
  href,
  icon: Icon,
  label,
  count,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
}) {
  return (
    <Link href={href} className="flex h-[52px] items-center gap-3 active:bg-neutral-50">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50">
        <Icon className="h-[20px] w-[20px] text-brand-600" />
      </span>
      <span className="flex-1 text-[15px] font-medium text-neutral-800">{label}</span>
      <span className="text-[13px] text-neutral-500">({toBengaliDigits(count)})</span>
      <ChevronRight className="h-4 w-4 text-neutral-300" />
    </Link>
  );
}
