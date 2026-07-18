'use client';

import { useOnboardingStore } from '@/stores/onboarding-store';
import { SplashStep } from '@/components/onboarding/SplashStep';
import { LanguageStep } from '@/components/onboarding/LanguageStep';
import { SlidesStep } from '@/components/onboarding/SlidesStep';
import { LocationStep } from '@/components/onboarding/LocationStep';
import { SigninStep } from '@/components/onboarding/SigninStep';

/**
 * Onboarding — VYTANEXA-BLUEPRINT.md § S03, full flow orchestration.
 * A single route (`/onboarding`, matching S02's route map) whose
 * rendered step is driven entirely by the persisted onboarding store
 * — this is what makes "resume from last completed step" (S03 Edge
 * Cases) work for free: the store's `step` survives an app kill, so a
 * re-visit to this same URL picks up wherever the user left off.
 */
export default function OnboardingPage() {
  const step = useOnboardingStore((s) => s.step);

  switch (step) {
    case 'splash':
      return <SplashStep />;
    case 'language':
      return <LanguageStep />;
    case 'slides':
      return <SlidesStep />;
    case 'location':
      return <LocationStep />;
    case 'signin':
      return <SigninStep />;
    default:
      return <SplashStep />;
  }
}
