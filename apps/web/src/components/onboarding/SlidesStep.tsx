'use client';

import { useRef, useState } from 'react';
import { useT } from '@vytanexa/i18n/client';
import { useOnboardingStore } from '@/stores/onboarding-store';

const SLIDE_META = [
  { emoji: '👨‍⚕️', bg: 'bg-brand-50' },
  { emoji: '🏥', bg: 'bg-life-50' },
  { emoji: '🚑', bg: 'bg-emergency-50' },
];

/**
 * Onboarding Slides — VYTANEXA-BLUEPRINT.md § S03 "SCREEN 3A-3C"
 * Real illustration assets don't exist yet — using a large emoji +
 * tinted background as an honest placeholder rather than blocking
 * this step on asset production. Swap-in point is isolated to the
 * `emoji`/`bg` fields in SLIDES above.
 */
export function SlidesStep() {
  const setStep = useOnboardingStore((s) => s.setStep);
  const t = useT('onboarding');
  const slideText = t.raw('slides' as Parameters<typeof t.raw>[0]) as { title: string; desc: string }[];
  const SLIDES = SLIDE_META.map((meta, i) => ({ ...meta, ...slideText[i]! }));
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const goToSlide = (i: number) => {
    scrollRef.current?.children[i]?.scrollIntoView({ behavior: 'smooth', inline: 'start' });
    setIndex(i);
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const isLast = index === SLIDES.length - 1;

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex justify-end px-6 pt-4">
        <button onClick={() => setStep('location')} className="text-[14px] text-neutral-500">
          {t('skip')}
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
      >
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            className="flex w-full shrink-0 snap-start flex-col items-center justify-center px-8"
          >
            <div
              className={`flex h-[200px] w-[200px] items-center justify-center rounded-full ${slide.bg} text-[80px]`}
            >
              {slide.emoji}
            </div>
            <h2 className="mt-8 text-center text-[22px] font-bold text-neutral-900">
              {slide.title}
            </h2>
            <p className="mt-2 text-center text-[15px] leading-relaxed text-neutral-600">
              {slide.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-1.5 py-4">
        {SLIDES.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'w-6 bg-brand-600' : 'w-1.5 bg-neutral-300'
            }`}
          />
        ))}
      </div>

      <div className="px-6 pb-8">
        <button
          onClick={() => (isLast ? setStep('location') : goToSlide(index + 1))}
          className={`h-12 w-full rounded-md text-[16px] font-semibold ${
            isLast ? 'bg-life-600 text-white' : 'border border-brand-600 text-brand-600'
          }`}
        >
          {isLast ? t('getStarted') : t('next')}
        </button>
      </div>
    </div>
  );
}
