import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { notificationCreateSchema } from '@/lib/validations/polls';
import { sendPushForNotification, type PushResult } from '@/lib/web-push';

// Push fan-out happens inside this request; allow the longest serverless window.
export const maxDuration = 60;

/**
 * POST /api/admin/notifications — send broadcast (A11).
 * Types: general/emergency are broadcasts; personal requires target_user_id.
 */
export async function POST(request: Request) {
  const session = await requireRole('admin');
  const parsed = notificationCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const body = parsed.data;
  const supabase = createServiceRoleClient();

  if (body.type === 'personal' && !body.target_user_id) {
    return NextResponse.json({ error: 'personal নোটিফিকেশনে target_user_id বাধ্যতামূলক' }, { status: 400 });
  }

  const { data: created, error } = await supabase
    .from('notifications')
    .insert({
      type: body.type,
      title: body.title.trim(),
      body: body.body.trim(),
      target_url: body.target_url || null,
      target_user_id: body.target_user_id ?? null,
      show_as_banner: body.show_as_banner ?? false,
      expires_at: body.expires_at ? (body.expires_at as Date).toISOString() : null,
      is_active: body.is_active ?? true,
      created_by: session.id,
    } as never)
    .select()
    .single();

  if (error || !created) return NextResponse.json({ error: 'নোটিফিকেশন পাঠানো যায়নি: ' + (error?.message ?? '') }, { status: 500 });
  await writeAudit(supabase, session.id, 'create', 'notification', (created as { id: string }).id, { after: created });

  // Web Push to subscribed devices — only for live notifications. A push
  // failure must never fail the (already saved) notification: report it.
  let push: PushResult | { error: string } = { configured: false };
  const n = created as { id: string; type: string; title: string; body: string; target_url: string | null; target_user_id: string | null; is_active: boolean; expires_at: string | null };
  const live = n.is_active && (!n.expires_at || new Date(n.expires_at).getTime() > Date.now());
  if (live) {
    try {
      push = await sendPushForNotification(supabase, n);
    } catch (err) {
      console.error('push fan-out failed:', err);
      push = { error: err instanceof Error ? err.message : 'push failed' };
    }
  }
  return NextResponse.json({ notification: created, push }, { status: 201 });
}
