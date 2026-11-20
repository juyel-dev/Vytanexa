import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Persisted first-run progress. Location data itself remains in the
 * shared location store so onboarding and the app use one source.
 */
export type OnboardingStep = 'splash' | 'language' | 'slides' | 'location' | 'signin' | 'done';

type OnboardingState = {
  step: OnboardingStep;
  language: 'bn' | 'en' | 'hi';
  slideIndex: number;
  setStep: (step: OnboardingStep) => void;
  setLanguage: (lang: 'bn' | 'en' | 'hi') => void;
  setSlideIndex: (index: number) => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      step: 'splash',
      language: 'en',
      slideIndex: 0,
      setStep: (step) => set({ step }),
      setLanguage: (language) => set({ language }),
      setSlideIndex: (slideIndex) => set({ slideIndex }),
      reset: () => set({ step: 'splash', language: 'en', slideIndex: 0 }),
    }),
    { name: 'vytanexa_onboarding' }
  )
);
