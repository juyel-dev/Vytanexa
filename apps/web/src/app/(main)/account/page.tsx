import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { AccountHomeClient } from '@/components/account/AccountHomeClient';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { getFavorites, getLeadsHistory, getMyQuestions, getMyReviews } from '@/lib/queries/account';

export const metadata: Metadata = {
  title: 'আমার অ্যাকাউন্ট | Vytanexa',
};

/**
 * Account Home — VYTANEXA-BLUEPRINT.md § S17, "Auth-Guarded". Every
 * `/account/*` page redirects guests to sign-in rather than rendering
 * anything — checked per-page (not via a shared layout guard) since
 * each page needs the resolved `currentUser` anyway for its own
 * queries, and a per-page check keeps that data-fetching co-located
 * with the guard rather than split across a layout + page boundary.
 */
export default async function AccountPage() {
  const supabase = createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    redirect('/auth/login?returnUrl=/account');
  }

  const userId = currentUser.authUser.id;
  const [{ doctors, hospitals }, history, questions, reviews] = await Promise.all([
    getFavorites(supabase, userId),
    getLeadsHistory(supabase, userId),
    getMyQuestions(supabase, userId),
    getMyReviews(supabase, userId),
  ]);

  return (
    <>
      <TopBarSection title="আমার অ্যাকাউন্ট" backHref="/more" />
      <AccountHomeClient
        name={currentUser.profile.name}
        phone={currentUser.profile.phone}
        counts={{
          favorites: doctors.length + hospitals.length,
          history: history.length,
          questions: questions.length,
          reviews: reviews.length,
        }}
      />
    </>
  );
}
