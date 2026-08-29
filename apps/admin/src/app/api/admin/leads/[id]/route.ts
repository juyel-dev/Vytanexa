import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';

const schema = z.object({ status: z.enum(['new', 'contacted', 'completed', 'cancelled', 'spam']) });

/**
 * PATCH /api/admin/leads/[id] — update lead status (A13).
 * Allowed: new → contacted → completed/cancelled/spam. Admin can set any.
 * Also sets contacted_at when moving to contacted.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'অবৈধ স্ট্যাটাস' }, { status: 400 });
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase.from('leads').select('*').eq('id', params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'লিড পাওয়া যায়নি' }, { status: 404 });

  const updates: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === 'contacted' && !(existing as { contacted_at: string | null }).contacted_at) {
    updates.contacted_at = new Date().toISOString();
  }

  const { error } = await supabase.from('leads').update(updates as never).eq('id', params.id);
  if (error) return NextResponse.json({ error: 'আপডেট করা যায়নি: ' + error.message }, { status: 500 });

  await writeAudit(supabase, session.id, 'update', 'lead', params.id, { before: { status: (existing as { status: string }).status }, after: { status: parsed.data.status } });
  return NextResponse.json({ ok: true });
}
