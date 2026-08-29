import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';

const schema = z.object({
  orderedIds: z.array(z.string().uuid()).max(200),
  visibility: z.record(z.boolean()).optional(), // id -> show_in_menu
});

/**
 * POST /api/admin/custom-pages/menu — reorder menu_order + toggle show_in_menu (A08 Menu Manager).
 * Gate: super_admin. Only custom_pages with is_published handling is client-side; this just persists order/visibility.
 */
export async function POST(request: Request) {
  const session = await requireRole('super_admin');
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'অবৈধ ডেটা' }, { status: 400 });
  const { orderedIds, visibility } = parsed.data;
  const supabase = createServiceRoleClient();

  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i]!;
    const patch: Record<string, unknown> = { menu_order: i };
    if (visibility && id in visibility) patch.show_in_menu = visibility[id];
    const { error } = await supabase.from('custom_pages').update(patch as never).eq('id', id);
    if (error) return NextResponse.json({ error: 'মেনু আপডেট করা যায়নি: ' + error.message }, { status: 500 });
  }

  // also apply visibility for ids not in orderedIds but in visibility map (e.g., toggled off without reorder)
  if (visibility) {
    for (const [id, show] of Object.entries(visibility)) {
      if (orderedIds.includes(id)) continue;
      const { error } = await supabase.from('custom_pages').update({ show_in_menu: show } as never).eq('id', id);
      if (error) return NextResponse.json({ error: 'মেনু আপডেট করা যায়নি: ' + error.message }, { status: 500 });
    }
  }

  await writeAudit(supabase, session.id, 'update', 'custom_pages_menu', null, { after: { orderedIds, visibility } });
  return NextResponse.json({ ok: true });
}
