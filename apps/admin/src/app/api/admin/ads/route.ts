import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { adCreateSchema } from '@/lib/validations/subscriptions';

export async function POST(request: Request) {
  const session = await requireRole('admin');
  const parsed = adCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const body = parsed.data;
  const supabase = createServiceRoleClient();

  const { data: created, error } = await supabase
    .from('ads')
    .insert({
      placement: body.placement,
      sponsor_name: body.sponsor_name.trim(),
      image_url: body.image_url.trim(),
      target_url: body.target_url.trim(),
      display_order: body.display_order ?? 0,
      start_date: body.start_date,
      end_date: body.end_date,
      is_active: body.is_active ?? true,
    } as never)
    .select()
    .single();

  if (error || !created) return NextResponse.json({ error: 'বিজ্ঞাপন তৈরি করা যায়নি: ' + (error?.message ?? '') }, { status: 500 });
  await writeAudit(supabase, session.id, 'create', 'ad', (created as { id: string }).id, { after: created });
  return NextResponse.json({ ad: created }, { status: 201 });
}
