import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PATCH /api/account/notification-prefs — VYTANEXA-BLUEPRINT.md § S18
 * "Notification Toggles": "Granular opt-out for non-critical
 * notification types." `emergency` is deliberately rejected here even
 * if sent — non-togglable by design ("a locked/disabled switch state
 * communicates this is a safety broadcast, not marketing"), enforced
 * server-side too, not just as a disabled UI control a determined
 * client could bypass.
 */
export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'সাইন ইন করুন' }, { status: 401 });
  }

  const { general, articles } = await request.json();

  const { data: current } = await supabase
    .from('users')
    .select('notification_prefs')
    .eq('id', user.id)
    .single();

  const prefs = (current?.notification_prefs as Record<string, boolean>) ?? {};
  const updated = {
    ...prefs,
    ...(general !== undefined && { general: !!general }),
    ...(articles !== undefined && { articles: !!articles }),
    emergency: true, // always-on, never accepted from the client
  };

  const { error } = await supabase
    .from('users')
    .update({ notification_prefs: updated })
    .eq('id', user.id);

  if (error) {
    console.error('notification prefs update failed:', error.message);
    return NextResponse.json({ error: 'আপডেট করতে সমস্যা হয়েছে' }, { status: 500 });
  }

  return NextResponse.json({ success: true, notification_prefs: updated });
}
