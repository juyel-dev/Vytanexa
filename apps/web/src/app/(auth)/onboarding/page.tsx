'use client';

import { useOnboardingStore } from '@/stores/onboarding-store';
import { SplashStep } from '@/components/onboarding/SplashStep';
import { SlidesStep } from '@/components/onboarding/SlidesStep';
import { LocationStep } from '@/components/onboarding/LocationStep';
import { SigninStep } from '@/components/onboarding/SigninStep';

/**
 * Lightweight first-run flow: splash → one introduction screen → location → sign-in.
 * The current step is persisted so an interrupted onboarding can resume.
 */
export default function OnboardingPage() {
  const step = useOnboardingStore((s) => s.step);

  switch (step) {
    case 'splash':
      return <SplashStep />;
    case 'slides':
      return <SlidesStep />;
    case 'location':
      return <LocationStep />;
    case 'signin':
      return <SigninStep />;
    default:
      // Older installs may still have the removed "language" step persisted.
      return <SplashStep />;
  }
}
