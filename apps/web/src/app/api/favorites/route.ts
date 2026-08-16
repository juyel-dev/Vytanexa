import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Favorites — VYTANEXA-BLUEPRINT.md § S17 "Heart-icon toggle available
 * globally on Doctor/Hospital cards everywhere in the app ... writes
 * to user_favorites (user_id, entity_type, entity_id)." Auth-required
 * at the RLS layer (`favorites_own_all`: `auth.uid() = user_id`) — a
 * guest's request has no session, so the insert/delete would just
 * fail; the client is expected to soft-gate before calling this (spec:
 * "guest users tapping heart → inline prompt 'সাইন ইন করে সেভ করুন',
 * not a hard redirect"), but this route also returns a clean 401 as a
 * defense-in-depth backstop if a guest's request reaches it anyway.
 */
export async function POST(request: NextRequest) {
  const { entityType, entityId } = await request.json();
  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'তথ্য অসম্পূর্ণ' }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'সাইন ইন করুন', requiresSignIn: true }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from('user_favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('user_favorites').delete().eq('id', existing.id);
    if (error) return NextResponse.json({ error: 'সমস্যা হয়েছে' }, { status: 500 });
    return NextResponse.json({ favorited: false });
  }

  const { error } = await supabase
    .from('user_favorites')
    .insert({ user_id: user.id, entity_type: entityType, entity_id: entityId });
  if (error) return NextResponse.json({ error: 'সমস্যা হয়েছে' }, { status: 500 });
  return NextResponse.json({ favorited: true });
}

/**
 * GET /api/favorites — returns just this user's favorited entity IDs
 * (not full records), for cards to know whether to render the heart
 * filled. Guests get an empty set back rather than a 401 here — list
 * pages call this unconditionally on mount and shouldn't need to
 * special-case "not signed in" as an error state.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ favorites: [] });

  const { data, error } = await supabase
    .from('user_favorites')
    .select('entity_type, entity_id')
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ favorites: [] });
  return NextResponse.json({ favorites: data ?? [] });
}
