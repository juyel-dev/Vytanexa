'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useOnboardingStore } from '@/stores/onboarding-store';

const LANGUAGES: { code: 'bn' | 'en' | 'hi'; native: string; english: string }[] = [
  { code: 'bn', native: 'বাংলা', english: 'Bengali' },
  { code: 'en', native: 'English', english: 'English' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi' },
];

/**
 * Language Selection — VYTANEXA-BLUEPRINT.md § S03 "SCREEN 2"
 * Default: browser-detected language when it matches a supported
 * option, else Bengali (the app's own default, S02 § 7).
 */
export function LanguageStep() {
  const setStep = useOnboardingStore((s) => s.setStep);
  const storeLanguage = useOnboardingStore((s) => s.language);
  const setLanguageInStore = useOnboardingStore((s) => s.setLanguage);
  const [selected, setSelected] = useState<'bn' | 'en' | 'hi'>(storeLanguage);

  const handleContinue = () => {
    setLanguageInStore(selected);
    document.cookie = `locale=${selected}; path=/; max-age=31536000`;
    setStep('slides');
  };

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6">
      <p className="text-center text-2xl">🌐</p>
      <h1 className="mt-3 text-center text-[18px] font-semibold text-neutral-900">
        Select your language
      </h1>
      <p className="text-center text-[16px] font-semibold text-neutral-900">
        আপনার ভাষা বেছে নিন
      </p>
      <p className="text-center text-[15px] text-neutral-600">अपनी भाषा चुनें</p>

      <div className="mt-6 flex flex-col gap-3">
        {LANGUAGES.map((lang) => {
          const isSelected = selected === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => setSelected(lang.code)}
              className={`flex h-16 items-center justify-between rounded-xl border px-4 transition-colors ${
                isSelected ? 'border-brand-600 bg-brand-50' : 'border-neutral-200 bg-white'
              }`}
            >
              <div className="text-left">
                <p className="text-[17px] font-semibold text-neutral-900">{lang.native}</p>
                <p className="text-[13px] text-neutral-500">{lang.english}</p>
              </div>
              {isSelected && <Check className="h-5 w-5 text-brand-600" />}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleContinue}
        className="mt-8 h-12 rounded-md bg-brand-600 text-[16px] font-semibold text-white"
      >
        Continue / এগিয়ে যান
      </button>
      <p className="mt-3 text-center text-[12px] text-neutral-400">
        ভাষা পরে পরিবর্তন করা যাবে
      </p>
    </div>
  );
}
