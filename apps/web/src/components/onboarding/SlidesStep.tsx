'use client';

import { Ambulance, Hospital, Stethoscope } from 'lucide-react';
import { useT } from '@vytanexa/i18n/client';
import { useOnboardingStore } from '@/stores/onboarding-store';

const CARD_META = [
  {
    Icon: Stethoscope,
    iconClass: 'bg-brand-50 text-brand-600',
    delay: '0ms',
  },
  {
    Icon: Hospital,
    iconClass: 'bg-life-50 text-life-600',
    delay: '140ms',
  },
  {
    Icon: Ambulance,
    iconClass: 'bg-emergency-50 text-emergency-600',
    delay: '280ms',
  },
];

/**
 * One compact introduction screen. Cards animate in with CSS only:
 * no video, remote images, animation library, or extra network requests.
 */
export function SlidesStep() {
  const setStep = useOnboardingStore((s) => s.setStep);
  const t = useT('onboarding');
  const slideText = t.raw('slides' as Parameters<typeof t.raw>[0]) as {
    title: string;
    desc: string;
  }[];

  return (
    <main className="flex min-h-dvh flex-col px-6 pb-8 pt-12">
      <div className="flex-1">
        <h1 className="text-center text-[25px] font-bold leading-tight text-neutral-900">
          {t('intro_title')}
        </h1>
        <p className="mx-auto mt-2 max-w-[320px] text-center text-[14px] leading-relaxed text-neutral-600">
          {t('intro_subtitle')}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {CARD_META.map(({ Icon, iconClass, delay }, index) => {
            const slide = slideText[index];
            if (!slide) return null;

            return (
              <article
                key={slide.title}
                className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm animate-fade-in"
                style={{ animationDelay: delay }}
              >
                <div
                  aria-hidden="true"
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
                >
                  <Icon size={26} strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[16px] font-semibold text-neutral-900">
                    {slide.title}
                  </h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">
                    {slide.desc}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => setStep('location')}
        className="mt-8 h-12 w-full rounded-xl bg-brand-600 text-[16px] font-semibold text-white transition-colors hover:bg-brand-700"
      >
        {t('getStarted')}
      </button>
    </main>
  );
}
