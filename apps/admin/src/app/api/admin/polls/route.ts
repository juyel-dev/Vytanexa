import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { pollCreateSchema } from '@/lib/validations/polls';

/**
 * POST /api/admin/polls — create poll with options (A11).
 * Gate: admin/super_admin.
 */
export async function POST(request: Request) {
  const session = await requireRole('admin');
  const parsed = pollCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const { question, options, expires_at, is_active } = parsed.data;
  const supabase = createServiceRoleClient();

  const { data: poll, error } = await supabase
    .from('polls')
    .insert({
      question: question.trim(),
      expires_at: expires_at ? (expires_at as Date).toISOString() : null,
      is_active: is_active ?? true,
      created_by: session.id,
    } as never)
    .select()
    .single();

  if (error || !poll) return NextResponse.json({ error: 'পোল তৈরি করা যায়নি: ' + (error?.message ?? '') }, { status: 500 });

  const pollId = (poll as { id: string }).id;
  const rows = options.map((text: string, idx: number) => ({
    poll_id: pollId,
    option_text: text,
    display_order: idx,
  }));

  const { error: optErr } = await supabase.from('poll_options').insert(rows as never);
  if (optErr) {
    await supabase.from('polls').delete().eq('id', pollId);
    return NextResponse.json({ error: 'অপশন সংরক্ষণ করা যায়নি: ' + optErr.message }, { status: 500 });
  }

  await writeAudit(supabase, session.id, 'create', 'poll', pollId, { after: { question, options } });
  return NextResponse.json({ poll }, { status: 201 });
}
