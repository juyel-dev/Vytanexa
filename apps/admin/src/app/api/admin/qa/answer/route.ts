import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { answerCreateSchema } from '@/lib/validations/articles';

/**
 * POST /api/admin/qa/answer — admin answers on behalf of a verified doctor (A10).
 * Inserts into answers with status='approved' (skips moderation queue).
 */
export async function POST(request: Request) {
  const session = await requireRole('admin');
  const parsed = answerCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const { question_id, doctor_id, body } = parsed.data;
  const supabase = createServiceRoleClient();

  const { data: question } = await supabase.from('questions').select('id, status').eq('id', question_id).maybeSingle();
  if (!question) return NextResponse.json({ error: 'প্রশ্ন পাওয়া যায়নি' }, { status: 404 });

  const { data: doctor } = await supabase.from('doctors').select('id, verification_status').eq('id', doctor_id).is('deleted_at', null).maybeSingle();
  if (!doctor || (doctor as { verification_status: string }).verification_status !== 'verified') {
    return NextResponse.json({ error: 'শুধু ভেরিফাইড ডাক্তারের পক্ষ থেকে উত্তর দেওয়া যায়' }, { status: 400 });
  }

  const { data: created, error } = await supabase
    .from('answers')
    .insert({
      question_id,
      doctor_id,
      body,
      status: 'approved',
    } as never)
    .select()
    .single();

  if (error || !created) return NextResponse.json({ error: 'উত্তর সংরক্ষণ করা যায়নি: ' + (error?.message ?? '') }, { status: 500 });

  await writeAudit(supabase, session.id, 'create', 'answer', (created as { id: string }).id, { after: created });
  return NextResponse.json({ answer: created }, { status: 201 });
}
