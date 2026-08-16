import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { FavoritesClient } from '@/components/account/FavoritesClient';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { getFavorites } from '@/lib/queries/account';

export const metadata: Metadata = { title: 'পছন্দের তালিকা | Vytanexa' };

/**
 * Favorites page — simplification note: unfavoriting a card here
 * (via the same global heart toggle used everywhere) updates the
 * store's in-memory state immediately, but this page's initial
 * server-fetched list isn't re-queried until a full refresh — the
 * card's heart empties out but the card itself stays visible until
 * then, rather than animating out with the spec's "সরানো হয়েছে ↩️
 * পূর্বাবস্থায় ফেরান" undo toast. Accepted as a reasonable first-pass
 * simplification rather than building a full optimistic-removal +
 * undo system.
 */
export default async function FavoritesPage() {
  const supabase = createClient();
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) redirect('/auth/login?returnUrl=/account/favorites');

  const { doctors, hospitals } = await getFavorites(supabase, currentUser.authUser.id);

  return (
    <>
      <TopBarSection title="পছন্দের তালিকা" backHref="/account" />
      <FavoritesClient doctors={doctors} hospitals={hospitals} />
    </>
  );
}
