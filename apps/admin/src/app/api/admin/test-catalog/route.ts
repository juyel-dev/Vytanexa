import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';

const schema = z.object({
  canonical_key: z.string().trim().min(1).regex(/^[a-z0-9_]+$/, 'canonical_key: a-z, 0-9, _ only'),
  name_translations: z.object({ bn: z.string().trim().min(1), en: z.string().trim().default(''), hi: z.string().trim().default('') }),
  aliases: z.array(z.string().trim()).optional().default([]),
  category: z.string().trim().optional().default(''),
});

/**
 * POST /api/admin/test-catalog — add a new test to catalog inline from hospital form.
 * Gate: admin.
 */
export async function POST(request: Request) {
  await requireRole('admin');
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const body = parsed.data;
  const supabase = createServiceRoleClient();

  const { data: clash } = await supabase.from('test_catalog').select('id').eq('canonical_key', body.canonical_key).maybeSingle();
  if (clash) return NextResponse.json({ error: `canonical_key "${body.canonical_key}" আগে থেকেই আছে` }, { status: 409 });

  const { data: created, error } = await supabase
    .from('test_catalog')
    .insert({
      canonical_key: body.canonical_key,
      name_translations: body.name_translations,
      aliases: body.aliases,
      category: body.category || null,
      is_active: true,
    } as never)
    .select()
    .single();

  if (error || !created) return NextResponse.json({ error: 'ক্যাটালগে যোগ করা যায়নি: ' + (error?.message ?? '') }, { status: 500 });
  return NextResponse.json({ test: created }, { status: 201 });
}
