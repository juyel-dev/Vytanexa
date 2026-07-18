'use client';

import { useRef, useState } from 'react';
import { useOnboardingStore } from '@/stores/onboarding-store';

const SLIDES = [
  {
    emoji: '👨‍⚕️',
    bg: 'bg-brand-50',
    titleBn: 'সঠিক ডাক্তার খুঁজুন',
    titleEn: 'Find the Right Doctor',
    subtitle: 'বিশেষজ্ঞতা, এলাকা বা উপসর্গ দিয়ে আপনার কাছের সেরা ডাক্তার খুঁজুন।',
  },
  {
    emoji: '🏥',
    bg: 'bg-life-50',
    titleBn: 'হাসপাতাল ও টেস্ট সহজে',
    titleEn: 'Hospitals & Diagnostics',
    subtitle: 'আইসিইউ, অ্যাম্বুলেন্স, ল্যাব টেস্ট সহ সব ধরনের স্বাস্থ্যসেবা এক জায়গায়।',
  },
  {
    emoji: '🚑',
    bg: 'bg-emergency-50',
    titleBn: 'জরুরি মুহূর্তে পাশে আছি',
    titleEn: 'Always Here in Emergencies',
    subtitle: 'অ্যাম্বুলেন্স, ব্লাড ব্যাংক ও জরুরি হেল্পলাইন — এক ট্যাপেই সংযোগ।',
  },
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
          এড়িয়ে যান
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
      >
        {SLIDES.map((slide) => (
          <div
            key={slide.titleEn}
            className="flex w-full shrink-0 snap-start flex-col items-center justify-center px-8"
          >
            <div
              className={`flex h-[200px] w-[200px] items-center justify-center rounded-full ${slide.bg} text-[80px]`}
            >
              {slide.emoji}
            </div>
            <h2 className="mt-8 text-center text-[22px] font-bold text-neutral-900">
              {slide.titleBn}
            </h2>
            <p className="mt-2 text-center text-[15px] leading-relaxed text-neutral-600">
              {slide.subtitle}
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
          {isLast ? 'শুরু করুন ✓' : 'পরবর্তী →'}
        </button>
      </div>
    </div>
  );
}
