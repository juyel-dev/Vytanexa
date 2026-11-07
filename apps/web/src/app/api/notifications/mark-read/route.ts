import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@vytanexa/i18n/server';

/**
 * POST /api/notifications/mark-read — signed-in users only (guests
 * track read-state in localStorage client-side, nothing to write
 * here for them — see `lib/queries/notifications.ts`). `upsert` with
 * `ignoreDuplicates` rather than a plain insert: tapping an
 * already-read notification again should be a harmless no-op, not a
 * duplicate-key error surfaced to the client.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const t = await getT('validation');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: true }); // guest: nothing to persist server-side
  }

  // Malformed JSON used to throw -> unhandled 500.
  const body = await request.json().catch(() => null);
  const notificationId = body?.notificationId;
  if (typeof notificationId !== 'string' || !UUID_RE.test(notificationId)) {
    return NextResponse.json({ error: t('generic.incompleteData') }, { status: 400 });
  }

  const { error } = await supabase
    .from('notification_reads')
    .upsert(
      { notification_id: notificationId, user_id: user.id },
      { onConflict: 'user_id,notification_id', ignoreDuplicates: true }
    );

  if (error) {
    console.error('mark-read failed:', error.message);
    return NextResponse.json({ error: t('generic.somethingWrong') }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
