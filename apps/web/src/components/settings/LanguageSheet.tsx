'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Check } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';

const LANGUAGES: { code: 'bn' | 'en' | 'hi'; native: string; english: string }[] = [
  { code: 'bn', native: 'বাংলা', english: 'Bengali' },
  { code: 'en', native: 'English', english: 'English' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi' },
];

/**
 * Language Selection Sheet — VYTANEXA-BLUEPRINT.md § S18 "Language
 * Row": "Tap → same Language Selection sheet as onboarding (S03)."
 * A new `BottomSheet`-based component rather than literally reusing
 * `onboarding/LanguageStep.tsx` — that component is a full-page
 * onboarding step wired to the onboarding flow's own Zustand store
 * (`useOnboardingStore`), which is the wrong interaction shape for a
 * settings row (tap → sheet → instant apply → close), and pulling in
 * the onboarding store here would be a mismatched dependency. Same
 * three language options, same visual language, correct surface.
 *
 * S22: now wired to next-intl — the locale cookie is read server-side
 * (RootLayout + i18n/request.ts) and BottomNav/nav etc. re-render via
 * `useTranslations()`. The `router.refresh()` forces a soft RSC
 * revalidation so the new messages are fetched without a full hard
 * reload. DB-content `getLocalizedField()` threading remains incremental
 * (see `lib/getLocale.ts`), but chrome translation is now live.
 */
export function LanguageSheet({
  open,
  onClose,
  currentLanguage,
  isSignedIn,
}: {
  open: boolean;
  onClose: () => void;
  currentLanguage: string;
  isSignedIn: boolean;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [selected, setSelected] = useState(currentLanguage);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (code: string) => {
    setSelected(code);
    setSaving(true);
    document.cookie = `locale=${code}; path=/; max-age=31536000`;

    if (isSignedIn) {
      await fetch('/api/account/profile', {
        method: 'PATCH',
        body: JSON.stringify({ preferred_language: code }),
      }).catch(() => {});
    }
    setSaving(false);
    onClose();
    router.refresh();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={locale === 'en' ? 'Select language' : 'ভাষা নির্বাচন করুন'}>
      <div className="flex flex-col gap-2.5">
        {LANGUAGES.map((lang) => {
          const isSelected = selected === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              disabled={saving}
              className={`flex h-14 items-center justify-between rounded-xl border px-4 ${
                isSelected ? 'border-brand-600 bg-brand-50' : 'border-neutral-200 bg-white'
              }`}
            >
              <div className="text-left">
                <p className="text-[15px] font-semibold text-neutral-900">{lang.native}</p>
                <p className="text-[12px] text-neutral-500">{lang.english}</p>
              </div>
              {isSelected && <Check className="h-5 w-5 text-brand-600" />}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
