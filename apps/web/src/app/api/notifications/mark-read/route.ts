import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/notifications/mark-read — signed-in users only (guests
 * track read-state in localStorage client-side, nothing to write
 * here for them — see `lib/queries/notifications.ts`). `upsert` with
 * `ignoreDuplicates` rather than a plain insert: tapping an
 * already-read notification again should be a harmless no-op, not a
 * duplicate-key error surfaced to the client.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: true }); // guest: nothing to persist server-side
  }

  const { notificationId } = await request.json();
  if (!notificationId) {
    return NextResponse.json({ error: 'তথ্য অসম্পূর্ণ' }, { status: 400 });
  }

  const { error } = await supabase
    .from('notification_reads')
    .upsert(
      { notification_id: notificationId, user_id: user.id },
      { onConflict: 'user_id,notification_id', ignoreDuplicates: true }
    );

  if (error) {
    console.error('mark-read failed:', error.message);
    return NextResponse.json({ error: 'সমস্যা হয়েছে' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
