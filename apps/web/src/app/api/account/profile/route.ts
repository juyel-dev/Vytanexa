import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@vytanexa/database';
import { profileUpdateSchema } from '@/lib/validations/account';

/**
 * PATCH /api/account/profile — VYTANEXA-BLUEPRINT.md § S17 "Profile
 * Edit (`/account/profile`)": "Name, phone (read-only, verified via
 * OTP — changing requires re-verification flow), email (optional)."
 * Phone is deliberately not accepted here at all — the spec's own
 * "requires re-verification flow" note means changing it needs a
 * fresh OTP round-trip through `/auth/verify`, not a plain field
 * update; that flow isn't built yet (tracked in TODO.md), so this
 * route only ever touches `name`/`email`/`preferred_language`/
 * `default_location_id` rather than silently accepting a phone change
 * it can't actually verify.
 */
export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'সাইন ইন করুন' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' },
      { status: 400 }
    );
  }
  const { name, email, preferred_language, default_location_id } = parsed.data;

  const updates: Database['public']['Tables']['users']['Update'] = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email || null;
  if (preferred_language !== undefined) updates.preferred_language = preferred_language;
  if (default_location_id !== undefined) updates.default_location_id = default_location_id;

  const { error } = await supabase.from('users').update(updates).eq('id', user.id);

  if (error) {
    console.error('profile update failed:', error.message);
    return NextResponse.json({ error: 'আপডেট করতে সমস্যা হয়েছে' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
