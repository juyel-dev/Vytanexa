import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** POST /api/notifications/mark-all-read — "সব পড়া হয়েছে" bulk action, signed-in users only. */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: true }); // guest handles this entirely client-side
  }

  const { notificationIds } = await request.json();
  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    return NextResponse.json({ success: true });
  }
  // TODO.md Phase 9.3b: the client only ever sends the ids it just
  // rendered (getNotifications caps at 50), so a real client can never
  // hit this — this is just a floor against a crafted request sending
  // an unbounded array. The notification_id FK (ON DELETE CASCADE)
  // already rejects anything that isn't a real notification, so junk
  // ids were never actually insertable; this only caps request size.
  if (notificationIds.length > 50) {
    return NextResponse.json({ error: 'অনেক বেশি আইটেম' }, { status: 400 });
  }

  const rows = notificationIds.map((id: string) => ({ notification_id: id, user_id: user.id }));

  const { error } = await supabase
    .from('notification_reads')
    .upsert(rows, { onConflict: 'user_id,notification_id', ignoreDuplicates: true });

  if (error) {
    console.error('mark-all-read failed:', error.message);
    return NextResponse.json({ error: 'সমস্যা হয়েছে' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
