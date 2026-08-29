import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { pollUpdateSchema } from '@/lib/validations/polls';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const parsed = pollUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const body = parsed.data;
  const supabase = createServiceRoleClient();
  const id = params.id;

  const { data: poll } = await supabase.from('polls').select('id, total_votes, expires_at').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!poll) return NextResponse.json({ error: 'পোল পাওয়া যায়নি' }, { status: 404 });

  const hasVotes = ((poll as { total_votes: number }).total_votes ?? 0) > 0;

  // if has votes, options become read-only
  if (hasVotes && body.options !== undefined) {
    return NextResponse.json({ error: 'ভোট পড়ার পর অপশন পরিবর্তন করা যায় না' }, { status: 409 });
  }

  const updates: Record<string, unknown> = {};
  if (body.question !== undefined) updates.question = body.question.trim();
  if (body.expires_at !== undefined) updates.expires_at = body.expires_at ? (body.expires_at as Date).toISOString() : null;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('polls').update(updates as never).eq('id', id);
    if (error) return NextResponse.json({ error: 'আপডেট করা যায়নি: ' + error.message }, { status: 500 });
  }

  // options update (only if no votes)
  if (body.options !== undefined && !hasVotes) {
    // replace options
    await supabase.from('poll_options').delete().eq('poll_id', id);
    const rows = body.options.map((text: string, idx: number) => ({ poll_id: id, option_text: text, display_order: idx }));
    const { error } = await supabase.from('poll_options').insert(rows as never);
    if (error) return NextResponse.json({ error: 'অপশন আপডেট করা যায়নি: ' + error.message }, { status: 500 });
  }

  const { data: updated } = await supabase.from('polls').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
  await writeAudit(supabase, session.id, 'update', 'poll', id, { before: poll, after: updated });
  return NextResponse.json({ poll: updated });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const supabase = createServiceRoleClient();
  const id = params.id;
  const { data: existing } = await supabase.from('polls').select('id, total_votes').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'পোল পাওয়া যায়নি' }, { status: 404 });
  const { error } = await supabase.from('polls').update({ deleted_at: new Date().toISOString() } as never).eq('id', id);
  if (error) return NextResponse.json({ error: 'মুছে ফেলা যায়নি: ' + error.message }, { status: 500 });
  await writeAudit(supabase, session.id, 'delete', 'poll', id, { before: existing });
  return NextResponse.json({ ok: true });
}
