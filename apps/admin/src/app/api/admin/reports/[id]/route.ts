import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';

/**
 * PATCH /api/admin/reports/[id] — A03 unified pattern, data_reports
 * variant: "'মার্ক রিজলভড' replaces approve/reject — reports don't
 * have content to approve, they flag something needing a manual fix
 * elsewhere... resolved_by/resolved_at captured automatically."
 * TODO.md Phase 9.4. Also supports 'dismissed' (schema's third status
 * — spam/invalid reports), not explicitly named in the spec's
 * interaction rules but present in the CHECK constraint, so wired
 * the same way as resolved rather than left unreachable.
 */
const schema = z.object({ status: z.enum(['resolved', 'dismissed']) });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'অবৈধ ডেটা' }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase.from('data_reports').select('*').eq('id', params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'রিপোর্ট পাওয়া যায়নি' }, { status: 404 });

  const { data: updated, error } = await supabase
    .from('data_reports')
    .update({ status: parsed.data.status, resolved_by: session.id, resolved_at: new Date().toISOString() } as never)
    .eq('id', params.id)
    .select()
    .single();

  if (error || !updated) return NextResponse.json({ error: 'আপডেট করা যায়নি' }, { status: 500 });

  await writeAudit(supabase, session.id, 'update', 'data_report', params.id, { before: existing, after: updated });
  return NextResponse.json({ report: updated });
}
