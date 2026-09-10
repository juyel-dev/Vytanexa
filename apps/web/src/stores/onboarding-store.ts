import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Onboarding Store — VYTANEXA-BLUEPRINT.md § S03 "STATE MANAGEMENT —
 * Onboarding". Location state itself lives in `location-store.ts`
 * (shared with the Location Chip elsewhere in the app, avoiding
 * duplication) — this store tracks the flow's own progress.
 *
 * Persisted so the flow resumes from the last completed step if the
 * app is killed mid-onboarding (S03 "Edge Cases" § "App killed
 * mid-onboarding"). Hydration is explicitly tracked so step effects
 * (notably the 2s splash timer) never race persisted state rehydration.
 */
export type OnboardingStep = 'splash' | 'language' | 'slides' | 'location' | 'signin' | 'done';

type OnboardingState = {
  step: OnboardingStep;
  language: 'bn' | 'en' | 'hi';
  slideIndex: number;
  hasHydrated: boolean;
  setStep: (step: OnboardingStep) => void;
  setLanguage: (lang: 'bn' | 'en' | 'hi') => void;
  setSlideIndex: (index: number) => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      step: 'splash',
      language: 'bn',
      slideIndex: 0,
      hasHydrated: false,
      setStep: (step) => set({ step }),
      setLanguage: (language) => set({ language }),
      setSlideIndex: (slideIndex) => set({ slideIndex }),
      reset: () => set({ step: 'splash', language: 'bn', slideIndex: 0 }),
    }),
    {
      name: 'vytanexa_onboarding',
      onRehydrateStorage: () => (state) => {
        if (state) state.hasHydrated = true;
      },
    }
  )
);
