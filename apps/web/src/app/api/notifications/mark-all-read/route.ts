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
