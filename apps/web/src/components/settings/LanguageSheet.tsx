'use client';

import { useState } from 'react';
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
 * Honest scope note: this sets the `locale` cookie (same mechanism
 * onboarding uses) and persists `preferred_language` to the profile
 * for signed-in users — real, working infrastructure. It does NOT
 * yet re-render existing Bengali UI chrome into the chosen language;
 * every page in this app currently calls `getLocalizedField()` with
 * its default locale rather than threading a resolved locale through,
 * because full UI-chrome i18n (next-intl or equivalent) is explicitly
 * S22 scope and hasn't been built. Spec's "applies instantly... re-
 * fetches translated content" is the S22-complete behavior; this
 * sheet lays the groundwork (the preference now persists correctly)
 * without overclaiming a rendering capability that doesn't exist yet.
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
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="ভাষা নির্বাচন করুন">
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
